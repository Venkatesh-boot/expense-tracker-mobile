import * as SQLite from 'expo-sqlite';
import type {
  BackupDocument,
  CurrencyCode,
  Expense,
  FamilyMember,
  Preferences,
  SyncExpenseRecord,
  SyncMemberRecord,
  SyncSnapshot,
  ThemePreference,
} from './models';
import { createId } from './models';

const DATABASE_NAME = 'family-expenses.db';
let database: SQLite.SQLiteDatabase | null = null;

function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error('Local expense storage has not been initialized.');
  }
  return database;
}

export async function initializeDatabase(): Promise<void> {
  database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      quantity REAL NOT NULL DEFAULT 1 CHECK (quantity > 0),
      unit TEXT NOT NULL DEFAULT 'item',
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL DEFAULT 'General',
      date TEXT NOT NULL,
      paid_by TEXT NOT NULL REFERENCES members(id),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date_created ON expenses (date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses (paid_by);
  `);
  const memberColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(members)'
  );
  if (!memberColumns.some((column) => column.name === 'updated_at')) {
    await database.execAsync(
      "ALTER TABLE members ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'"
    );
  }
  const expenseColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(expenses)'
  );
  if (!expenseColumns.some((column) => column.name === 'subcategory')) {
    await database.execAsync(
      "ALTER TABLE expenses ADD COLUMN subcategory TEXT NOT NULL DEFAULT 'General'"
    );
    await database.execAsync(`
      UPDATE expenses SET subcategory = CASE category
        WHEN 'Groceries' THEN 'Pantry'
        WHEN 'Food' THEN 'Restaurant'
        WHEN 'Transport' THEN 'Public transport'
        WHEN 'Home' THEN 'Maintenance'
        WHEN 'Bills' THEN 'Electricity'
        WHEN 'Health' THEN 'Pharmacy'
        WHEN 'Shopping' THEN 'Other shopping'
        ELSE 'General'
      END;
    `);
  }
  if (!expenseColumns.some((column) => column.name === 'quantity')) {
    await database.execAsync(
      'ALTER TABLE expenses ADD COLUMN quantity REAL NOT NULL DEFAULT 1 CHECK (quantity > 0)'
    );
  }
  if (!expenseColumns.some((column) => column.name === 'unit')) {
    await database.execAsync(
      "ALTER TABLE expenses ADD COLUMN unit TEXT NOT NULL DEFAULT 'item'"
    );
  }
  if (!expenseColumns.some((column) => column.name === 'updated_at')) {
    await database.execAsync(
      "ALTER TABLE expenses ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'"
    );
    await database.execAsync('UPDATE expenses SET updated_at = created_at');
  }
  if (!expenseColumns.some((column) => column.name === 'deleted_at')) {
    await database.execAsync('ALTER TABLE expenses ADD COLUMN deleted_at TEXT');
  }

  const memberCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM members'
  );
  if (!memberCount || memberCount.count === 0) {
    const selfId = createId();
    await database.runAsync(
      'INSERT INTO members (id, name, updated_at) VALUES (?, ?, ?)',
      selfId,
      'You',
      '1970-01-01T00:00:00.000Z'
    );
    await setSetting('selfId', selfId);
  }

  const settings = await readSettings();
  if (!settings.deviceId) {
    await setSetting('deviceId', createId());
  }
  if (!settings.currency) {
    await setSetting('currency', 'INR');
  }
  if (!settings.displayName) {
    await setSetting('displayName', 'You');
  }
  if (!settings.selfId) {
    const firstMember = await database.getFirstAsync<FamilyMember>(
      'SELECT id, name FROM members ORDER BY rowid LIMIT 1'
    );
    if (firstMember) {
      await setSetting('selfId', firstMember.id);
    }
  }
}

async function setSetting(key: string, value: string): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

async function readSettings(): Promise<Record<string, string>> {
  const rows = await getDatabase().getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings'
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function loadExpenses(): Promise<Expense[]> {
  return getDatabase().getAllAsync<Expense>(
    `SELECT id, title, amount, quantity, unit, category, subcategory, date, paid_by AS paidBy,
      notes, created_at AS createdAt
     FROM expenses
     WHERE deleted_at IS NULL
     ORDER BY date DESC, created_at DESC`
  );
}

export async function loadMembers(): Promise<FamilyMember[]> {
  return getDatabase().getAllAsync<FamilyMember>(
    'SELECT id, name FROM members ORDER BY name COLLATE NOCASE'
  );
}

export async function loadPreferences(): Promise<Preferences> {
  const values = await readSettings();
  const members = await loadMembers();
  const selfId = values.selfId || members[0]?.id || '';
  const parsedBudget = values.monthlyBudget ? Number(values.monthlyBudget) : NaN;
  const theme: ThemePreference =
    values.theme === 'dark' || values.theme === 'light' ? values.theme : 'auto';
  return {
    currency: (values.currency || 'INR') as CurrencyCode,
    displayName: values.displayName || 'You',
    selfId,
    monthlyBudget: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
    theme,
  };
}

export async function savePreferences(
  preferences: Preferences
): Promise<void> {
  const trimmedName = preferences.displayName.trim();
  const budgetValue =
    typeof preferences.monthlyBudget === 'number' &&
    Number.isFinite(preferences.monthlyBudget) &&
    preferences.monthlyBudget > 0
      ? String(preferences.monthlyBudget)
      : '';
  const themeValue: ThemePreference =
    preferences.theme === 'dark' || preferences.theme === 'light'
      ? preferences.theme
      : 'auto';
  await getDatabase().withTransactionAsync(async () => {
    await setSetting('currency', preferences.currency);
    await setSetting('displayName', trimmedName);
    await setSetting('selfId', preferences.selfId);
    await setSetting('monthlyBudget', budgetValue);
    await setSetting('theme', themeValue);
    const ownMember = await getDatabase().getFirstAsync<{ id: string }>(
      'SELECT id FROM members WHERE id = ?',
      preferences.selfId
    );
    if (ownMember) {
      await getDatabase().runAsync(
        'UPDATE members SET name = ?, updated_at = ? WHERE id = ?',
        trimmedName,
        new Date().toISOString(),
        preferences.selfId
      );
    }
  });
}

export async function addMember(member: FamilyMember): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO members (id, name, updated_at) VALUES (?, ?, ?)',
    member.id,
    member.name.trim(),
    new Date().toISOString()
  );
}

/** Renames an existing family member and keeps self displayName in sync. */
export async function renameMember(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Family member name cannot be empty.');
  }
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'UPDATE members SET name = ?, updated_at = ? WHERE id = ?',
      trimmed,
      new Date().toISOString(),
      id
    );
    if (result.changes === 0) {
      throw new Error('Family member could not be found.');
    }
    const settings = await readSettings();
    if (settings.selfId === id) {
      await setSetting('displayName', trimmed);
    }
  });
}

/** Removes a non-primary family member after reassigning their expenses. */
export async function removeMember(id: string, reassignToId: string): Promise<void> {
  if (id === reassignToId) {
    throw new Error('Choose another family member to reassign existing expenses.');
  }
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const settings = await readSettings();
    if (settings.selfId === id) {
      throw new Error('Your primary profile cannot be removed.');
    }
    const target = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM members WHERE id = ?',
      reassignToId
    );
    if (!target) {
      throw new Error('The reassignment family member does not exist.');
    }
    await db.runAsync(
      'UPDATE expenses SET paid_by = ?, updated_at = ? WHERE paid_by = ?',
      reassignToId,
      new Date().toISOString(),
      id
    );
    await db.runAsync('DELETE FROM members WHERE id = ?', id);
  });
}

export async function addExpense(expense: Expense): Promise<void> {
  const updatedAt = expense.createdAt || new Date().toISOString();
  await getDatabase().runAsync(
    `INSERT INTO expenses
      (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    expense.id,
    expense.title.trim(),
    expense.amount,
    expense.quantity,
    expense.unit.trim(),
    expense.category,
    expense.subcategory,
    expense.date,
    expense.paidBy,
    expense.notes.trim(),
    expense.createdAt,
    updatedAt
  );
}

export async function addExpenses(expenses: Expense[]): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    for (const expense of expenses) {
      const updatedAt = expense.createdAt || new Date().toISOString();
      await db.runAsync(
        `INSERT INTO expenses
          (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        expense.id,
        expense.title.trim(),
        expense.amount,
        expense.quantity,
        expense.unit.trim(),
        expense.category,
        expense.subcategory,
        expense.date,
        expense.paidBy,
        expense.notes.trim(),
        expense.createdAt,
        updatedAt
      );
    }
  });
}

/** Updates an existing expense record on this device. */
export async function updateExpense(expense: Expense): Promise<void> {
  const result = await getDatabase().runAsync(
    `UPDATE expenses
     SET title = ?, amount = ?, quantity = ?, unit = ?, category = ?, subcategory = ?,
         date = ?, paid_by = ?, notes = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    expense.title.trim(),
    expense.amount,
    expense.quantity,
    expense.unit.trim(),
    expense.category,
    expense.subcategory,
    expense.date,
    expense.paidBy,
    expense.notes.trim(),
    new Date().toISOString(),
    expense.id
  );
  if (result.changes === 0) {
    throw new Error('Expense could not be found.');
  }
}

export async function removeExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDatabase().runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id
  );
}

export async function createBackup(): Promise<BackupDocument> {
  const [members, expenses, preferences] = await Promise.all([
    loadMembers(),
    loadExpenses(),
    loadPreferences(),
  ]);
  return {
    app: 'family-expense-tracker',
    version: 2,
    exportedAt: new Date().toISOString(),
    preferences: {
      currency: preferences.currency,
      displayName: preferences.displayName,
    },
    members,
    expenses,
  };
}

export async function mergeBackup(
  backup: BackupDocument
): Promise<{ expensesAdded: number; membersAdded: number; currencyChanged: boolean }> {
  const db = getDatabase();
  let expensesAdded = 0;
  let membersAdded = 0;
  let currencyChanged = false;

  await db.withTransactionAsync(async () => {
    const existingExpenses = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM expenses WHERE deleted_at IS NULL'
    );
    const currentSettings = await readSettings();
    if (
      backup.expenses.length > 0 &&
      (existingExpenses?.count || 0) > 0 &&
      currentSettings.currency !== backup.preferences.currency
    ) {
      throw new Error(
        `This backup uses ${backup.preferences.currency}, but this phone uses ${currentSettings.currency}. Set both phones to the same currency before importing.`
      );
    }
    if (
      backup.expenses.length > 0 &&
      (existingExpenses?.count || 0) === 0 &&
      currentSettings.currency !== backup.preferences.currency
    ) {
      await setSetting('currency', backup.preferences.currency);
      currencyChanged = true;
    }

    const importTimestamp = new Date().toISOString();
    for (const member of backup.members) {
      const result = await db.runAsync(
        'INSERT OR IGNORE INTO members (id, name, updated_at) VALUES (?, ?, ?)',
        member.id,
        member.name,
        importTimestamp
      );
      membersAdded += result.changes;
    }
    for (const expense of backup.expenses) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO expenses
          (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        expense.id,
        expense.title,
        expense.amount,
        expense.quantity,
        expense.unit,
        expense.category,
        expense.subcategory,
        expense.date,
        expense.paidBy,
        expense.notes,
        expense.createdAt,
        expense.createdAt || importTimestamp
      );
      expensesAdded += result.changes;
    }
  });

  return { expensesAdded, membersAdded, currencyChanged };
}

/** Exports the full local database state including soft-delete tombstones for Wi-Fi sync. */
export async function exportSyncSnapshot(): Promise<SyncSnapshot> {
  const db = getDatabase();
  const [settings, members, expenses] = await Promise.all([
    readSettings(),
    db.getAllAsync<SyncMemberRecord>(
      'SELECT id, name, updated_at AS updatedAt FROM members'
    ),
    db.getAllAsync<SyncExpenseRecord>(
      `SELECT id, title, amount, quantity, unit, category, subcategory, date, paid_by AS paidBy,
        notes, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
       FROM expenses`
    ),
  ]);

  let deviceId = settings.deviceId;
  if (!deviceId) {
    deviceId = createId();
    await setSetting('deviceId', deviceId);
  }

  return {
    app: 'family-expense-tracker',
    syncVersion: 1,
    deviceId,
    exportedAt: new Date().toISOString(),
    currency: (settings.currency || 'INR') as CurrencyCode,
    members,
    expenses,
  };
}

/** Applies a merged sync snapshot atomically and records the last sync timestamp. */
export async function applyMergedSyncSnapshot(
  merged: SyncSnapshot,
  peerName?: string
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    const settings = await readSettings();
    if (settings.currency !== merged.currency) {
      await setSetting('currency', merged.currency);
    }

    for (const member of merged.members) {
      await db.runAsync(
        `INSERT INTO members (id, name, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
        member.id,
        member.name,
        member.updatedAt
      );
      if (settings.selfId && member.id === settings.selfId) {
        await setSetting('displayName', member.name);
      }
    }

    for (const expense of merged.expenses) {
      await db.runAsync(
        `INSERT INTO expenses
          (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          amount = excluded.amount,
          quantity = excluded.quantity,
          unit = excluded.unit,
          category = excluded.category,
          subcategory = excluded.subcategory,
          date = excluded.date,
          paid_by = excluded.paid_by,
          notes = excluded.notes,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
        expense.id,
        expense.title,
        expense.amount,
        expense.quantity,
        expense.unit,
        expense.category,
        expense.subcategory,
        expense.date,
        expense.paidBy,
        expense.notes,
        expense.createdAt,
        expense.updatedAt,
        expense.deletedAt
      );
    }

    await setSetting('lastSyncAt', now);
    if (peerName) {
      await setSetting('lastSyncPeer', peerName);
    }
  });
}

/** Saves the linked Google Drive / SAF sync file URI and display name. */
export async function saveLinkedSyncFile(uri: string, name: string): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await setSetting('syncFileUri', uri);
    await setSetting('syncFileName', name);
  });
}

/** Clears the linked Drive sync file from local settings. */
export async function clearLinkedSyncFile(): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await setSetting('syncFileUri', '');
    await setSetting('syncFileName', '');
  });
}

/** Records a sync completion timestamp without changing rows. */
export async function recordLastSyncAt(peerName?: string): Promise<void> {
  await setSetting('lastSyncAt', new Date().toISOString());
  if (peerName) {
    await setSetting('lastSyncPeer', peerName);
  }
}

/** Returns metadata about the linked Drive sync file and most recent sync. */
export async function loadLastSyncInfo(): Promise<{
  lastSyncAt: string | null;
  lastSyncPeer: string | null;
  syncFileUri: string | null;
  syncFileName: string | null;
}> {
  const settings = await readSettings();
  return {
    lastSyncAt: settings.lastSyncAt || null,
    lastSyncPeer: settings.lastSyncPeer || null,
    syncFileUri: settings.syncFileUri || null,
    syncFileName: settings.syncFileName || null,
  };
}
