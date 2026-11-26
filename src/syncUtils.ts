import {
  CATEGORIES,
  CURRENCIES,
  SUBCATEGORIES,
} from './domain';
import type {
  CurrencyCode,
  ExpenseCategory,
  SyncExpenseRecord,
  SyncMergeStats,
  SyncSnapshot,
  SyncMemberRecord,
} from './domain';

const DEFAULT_EPOCH_ISO = '1970-01-01T00:00:00.000Z';

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeIsoTimestamp(value: unknown, fallback = DEFAULT_EPOCH_ISO): string {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

function parseSyncMember(raw: unknown): SyncMemberRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asNonEmptyString(item.id);
  const name = asNonEmptyString(item.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    updatedAt: normalizeIsoTimestamp(item.updatedAt),
  };
}

function parseSyncExpense(raw: unknown): SyncExpenseRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asNonEmptyString(item.id);
  const title = asNonEmptyString(item.title);
  const paidBy = asNonEmptyString(item.paidBy);
  const date = asNonEmptyString(item.date);
  const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0
    ? item.amount
    : NaN;
  if (!id || !title || !paidBy || !date || !Number.isFinite(amount)) {
    return null;
  }

  const quantity =
    typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
      ? item.quantity
      : 1;
  const unit = asNonEmptyString(item.unit) ?? 'item';
  const category: ExpenseCategory =
    typeof item.category === 'string' &&
    (CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as ExpenseCategory)
      : 'Other';
  const subcategory =
    asNonEmptyString(item.subcategory) ?? SUBCATEGORIES[category]?.[0] ?? 'General';
  const notes = typeof item.notes === 'string' ? item.notes.trim() : '';
  const createdAt = normalizeIsoTimestamp(item.createdAt, new Date().toISOString());
  const updatedAt = normalizeIsoTimestamp(item.updatedAt, createdAt);
  const deletedAt =
    typeof item.deletedAt === 'string' && item.deletedAt.trim()
      ? normalizeIsoTimestamp(item.deletedAt)
      : null;

  return {
    id,
    title,
    amount,
    quantity,
    unit,
    category,
    subcategory,
    date,
    paidBy,
    notes,
    createdAt,
    updatedAt,
    deletedAt,
  };
}

/** Parses and validates an untrusted JSON payload received over local Wi-Fi sync. */
export function parseSyncSnapshot(raw: unknown): SyncSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Sync payload is not a valid object.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'family-expense-tracker' || obj.syncVersion !== 1) {
    throw new Error('This device received an incompatible sync format.');
  }
  const deviceId = asNonEmptyString(obj.deviceId);
  if (!deviceId) {
    throw new Error('Sync payload is missing its device identifier.');
  }
  if (!isCurrencyCode(obj.currency)) {
    throw new Error('Sync payload specifies an unsupported currency.');
  }
  if (!Array.isArray(obj.members) || !Array.isArray(obj.expenses)) {
    throw new Error('Sync payload is missing members or expenses.');
  }

  const members: SyncMemberRecord[] = [];
  for (const rawMember of obj.members) {
    const parsed = parseSyncMember(rawMember);
    if (parsed) members.push(parsed);
  }

  const expenses: SyncExpenseRecord[] = [];
  for (const rawExpense of obj.expenses) {
    const parsed = parseSyncExpense(rawExpense);
    if (parsed) expenses.push(parsed);
  }

  return {
    app: 'family-expense-tracker',
    syncVersion: 1,
    deviceId,
    exportedAt: normalizeIsoTimestamp(obj.exportedAt, new Date().toISOString()),
    currency: obj.currency,
    members,
    expenses,
  };
}

function membersDiffer(a: SyncMemberRecord, b: SyncMemberRecord): boolean {
  return a.name !== b.name || a.updatedAt !== b.updatedAt;
}

function pickWinningMember(
  local: SyncMemberRecord,
  remote: SyncMemberRecord
): SyncMemberRecord {
  const localMs = timestampMs(local.updatedAt);
  const remoteMs = timestampMs(remote.updatedAt);
  if (remoteMs !== localMs) {
    return remoteMs > localMs ? remote : local;
  }
  // Prefer non-default names over 'You' when migrated records share a timestamp.
  if (local.name === 'You' && remote.name !== 'You') return remote;
  if (remote.name === 'You' && local.name !== 'You') return local;
  return remote.name.localeCompare(local.name) > 0 ? remote : local;
}

function expensesContentDiffer(a: SyncExpenseRecord, b: SyncExpenseRecord): boolean {
  return (
    a.title !== b.title ||
    a.amount !== b.amount ||
    a.quantity !== b.quantity ||
    a.unit !== b.unit ||
    a.category !== b.category ||
    a.subcategory !== b.subcategory ||
    a.date !== b.date ||
    a.paidBy !== b.paidBy ||
    a.notes !== b.notes ||
    a.deletedAt !== b.deletedAt
  );
}

function pickWinningExpense(
  local: SyncExpenseRecord,
  remote: SyncExpenseRecord
): SyncExpenseRecord {
  const localMs = timestampMs(local.updatedAt);
  const remoteMs = timestampMs(remote.updatedAt);
  if (remoteMs !== localMs) {
    return remoteMs > localMs ? remote : local;
  }
  if (local.deletedAt !== remote.deletedAt) {
    return remote.deletedAt !== null ? remote : local;
  }
  const localSig = JSON.stringify(local);
  const remoteSig = JSON.stringify(remote);
  return remoteSig > localSig ? remote : local;
}

/**
 * Performs a deterministic Last-Write-Wins merge between the local phone's snapshot
 * and a remote family member's snapshot, returning the merged state and change counts
 * relative to `local`.
 */
export function mergeSyncSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot,
  nowIso = new Date().toISOString()
): { snapshot: SyncSnapshot; stats: SyncMergeStats } {
  const localActiveCount = local.expenses.filter((e) => e.deletedAt === null).length;
  const remoteActiveCount = remote.expenses.filter((e) => e.deletedAt === null).length;

  let currency: CurrencyCode = local.currency;
  let currencyAdopted = false;
  if (local.currency !== remote.currency) {
    if (localActiveCount > 0 && remoteActiveCount > 0) {
      throw new Error(
        `This phone uses ${local.currency}, while the other phone uses ${remote.currency}. Set both phones to the same currency before syncing.`
      );
    }
    if (localActiveCount === 0 && remoteActiveCount > 0) {
      currency = remote.currency;
      currencyAdopted = true;
    }
  }

  const mergedMembersMap = new Map<string, SyncMemberRecord>();
  let membersAdded = 0;
  let membersUpdated = 0;

  for (const member of local.members) {
    mergedMembersMap.set(member.id, member);
  }
  for (const remoteMember of remote.members) {
    const existing = mergedMembersMap.get(remoteMember.id);
    if (!existing) {
      mergedMembersMap.set(remoteMember.id, remoteMember);
      membersAdded += 1;
      continue;
    }
    const winner = pickWinningMember(existing, remoteMember);
    mergedMembersMap.set(remoteMember.id, winner);
    if (membersDiffer(existing, winner)) {
      membersUpdated += 1;
    }
  }

  const mergedExpensesMap = new Map<string, SyncExpenseRecord>();
  let expensesAdded = 0;
  let expensesUpdated = 0;
  let expensesDeleted = 0;

  for (const expense of local.expenses) {
    mergedExpensesMap.set(expense.id, expense);
  }
  for (const remoteExpense of remote.expenses) {
    const existing = mergedExpensesMap.get(remoteExpense.id);
    if (!existing) {
      mergedExpensesMap.set(remoteExpense.id, remoteExpense);
      if (remoteExpense.deletedAt === null) {
        expensesAdded += 1;
      }
      continue;
    }
    const winner = pickWinningExpense(existing, remoteExpense);
    mergedExpensesMap.set(remoteExpense.id, winner);
    if (existing.deletedAt === null && winner.deletedAt !== null) {
      expensesDeleted += 1;
    } else if (existing.deletedAt !== null && winner.deletedAt === null) {
      expensesAdded += 1;
    } else if (expensesContentDiffer(existing, winner)) {
      expensesUpdated += 1;
    }
  }

  // Ensure every referenced paidBy member ID exists to satisfy SQLite foreign keys.
  for (const expense of mergedExpensesMap.values()) {
    if (!mergedMembersMap.has(expense.paidBy)) {
      mergedMembersMap.set(expense.paidBy, {
        id: expense.paidBy,
        name: 'Family Member',
        updatedAt: DEFAULT_EPOCH_ISO,
      });
      membersAdded += 1;
    }
  }

  const members = Array.from(mergedMembersMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const expenses = Array.from(mergedExpensesMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  return {
    snapshot: {
      app: 'family-expense-tracker',
      syncVersion: 1,
      deviceId: local.deviceId,
      exportedAt: nowIso,
      currency,
      members,
      expenses,
    },
    stats: {
      membersAdded,
      membersUpdated,
      expensesAdded,
      expensesUpdated,
      expensesDeleted,
      currencyAdopted,
    },
  };
}
