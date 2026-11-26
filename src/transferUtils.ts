import { CATEGORIES, CURRENCIES, SUBCATEGORIES } from './domain';
import type {
  BackupDocument,
  CurrencyCode,
  Expense,
  ExpenseCategory,
  FamilyMember,
} from './domain';

export const BACKUP_APP = 'family-expense-tracker';
export const MAX_BACKUP_SIZE = 25 * 1024 * 1024;

export function parseBackup(contents: string): BackupDocument {
  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch {
    throw new Error('This file is not valid JSON.');
  }

  if (
    !isRecord(data) ||
    data.app !== BACKUP_APP ||
    (data.version !== 1 && data.version !== 2)
  ) {
    throw new Error('This is not a supported family expense backup.');
  }
  if (
    !Array.isArray(data.members) ||
    !Array.isArray(data.expenses) ||
    !isRecord(data.preferences) ||
    !isCurrency(data.preferences.currency) ||
    !isNonEmptyString(data.preferences.displayName, 100)
  ) {
    throw new Error('The backup is missing required family or expense data.');
  }

  const members = data.members.map(parseMember);
  const expenses = data.expenses.map(parseExpense);
  if (members.length === 0) {
    throw new Error('The backup does not contain any family members.');
  }
  const memberIds = new Set(members.map((member) => member.id));
  if (memberIds.size !== members.length) {
    throw new Error('The backup contains duplicate family member IDs.');
  }
  const expenseIds = new Set(expenses.map((expense) => expense.id));
  if (expenseIds.size !== expenses.length) {
    throw new Error('The backup contains duplicate expense IDs.');
  }
  if (expenses.some((expense) => !memberIds.has(expense.paidBy))) {
    throw new Error('The backup contains an expense with an unknown family member.');
  }
  return {
    app: BACKUP_APP,
    version: 2,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    preferences: {
      currency: data.preferences.currency,
      displayName: data.preferences.displayName.trim(),
    },
    members,
    expenses,
  };
}

/** Formats expenses and member names into an RFC-4180 CSV document. */
export function formatExpensesCsv(
  expenses: Expense[],
  members: FamilyMember[],
  currency: CurrencyCode
): string {
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const header = [
    'Date',
    'Title',
    'Quantity',
    'Unit',
    `Amount (${currency})`,
    'Category',
    'Subcategory',
    'Paid By',
    'Notes',
    'Created At',
  ];
  const rows = expenses.map((expense) => [
    expense.date,
    expense.title,
    String(expense.quantity),
    expense.unit,
    expense.amount.toFixed(2),
    expense.category,
    expense.subcategory,
    memberNames.get(expense.paidBy) || 'Family',
    expense.notes,
    expense.createdAt,
  ]);
  return [header, ...rows]
    .map((columns) => columns.map(escapeCsvCell).join(','))
    .join('\r\n');
}

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function parseMember(value: unknown): FamilyMember {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id, 128) ||
    !isNonEmptyString(value.name, 100)
  ) {
    throw new Error('The backup contains an invalid family member.');
  }
  return { id: value.id, name: value.name.trim() };
}

function parseExpense(value: unknown): Expense {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id, 128) ||
    !isNonEmptyString(value.title, 160) ||
    typeof value.amount !== 'number' ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    value.amount > 100_000_000 ||
    (value.quantity !== undefined &&
      (typeof value.quantity !== 'number' ||
        !Number.isFinite(value.quantity) ||
        value.quantity <= 0 ||
        value.quantity > 1_000_000)) ||
    (value.unit !== undefined && !isNonEmptyString(value.unit, 24)) ||
    !isCategory(value.category) ||
    typeof value.date !== 'string' ||
    !isIsoDate(value.date) ||
    !isNonEmptyString(value.paidBy, 128) ||
    typeof value.notes !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    throw new Error('The backup contains an invalid expense record.');
  }
  return {
    id: value.id,
    title: value.title.trim(),
    amount: value.amount,
    quantity: typeof value.quantity === 'number' ? value.quantity : 1,
    unit: typeof value.unit === 'string' ? value.unit.trim() : 'item',
    category: value.category,
    subcategory:
      typeof value.subcategory === 'string' && value.subcategory.trim()
        ? value.subcategory.trim()
        : SUBCATEGORIES[value.category][0],
    date: value.date,
    paidBy: value.paidBy,
    notes: value.notes,
    createdAt: value.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.includes(value as CurrencyCode);
}

function isCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && CATEGORIES.includes(value as ExpenseCategory);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}
