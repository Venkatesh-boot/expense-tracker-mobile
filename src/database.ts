import * as SQLite from 'expo-sqlite';
import type {
  BackupDocument,
  CurrencyCode,
  Expense,
  FamilyMember,
  Preferences,
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
      name TEXT NOT NULL
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
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date_created ON expenses (date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses (paid_by);
  `);
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

  const memberCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM members'
  );
  if (!memberCount || memberCount.count === 0) {
    const selfId = createId();
    await database.runAsync(
      'INSERT INTO members (id, name) VALUES (?, ?)',
      selfId,
      'You'
    );
    await setSetting('selfId', selfId);
  }

  const settings = await readSettings();
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
  return {
    currency: (values.currency || 'INR') as CurrencyCode,
    displayName: values.displayName || 'You',
    selfId,
  };
}

export async function savePreferences(
  preferences: Preferences
): Promise<void> {
  const trimmedName = preferences.displayName.trim();
  await getDatabase().withTransactionAsync(async () => {
    await setSetting('currency', preferences.currency);
    await setSetting('displayName', trimmedName);
    await setSetting('selfId', preferences.selfId);
    const ownMember = await getDatabase().getFirstAsync<{ id: string }>(
      'SELECT id FROM members WHERE id = ?',
      preferences.selfId
    );
    if (ownMember) {
      await getDatabase().runAsync(
        'UPDATE members SET name = ? WHERE id = ?',
        trimmedName,
        preferences.selfId
      );
    }
  });
}

export async function addMember(member: FamilyMember): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO members (id, name) VALUES (?, ?)',
    member.id,
    member.name.trim()
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
      'UPDATE members SET name = ? WHERE id = ?',
      trimmed,
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
      'UPDATE expenses SET paid_by = ? WHERE paid_by = ?',
      reassignToId,
      id
    );
    await db.runAsync('DELETE FROM members WHERE id = ?', id);
  });
}

export async function addExpense(expense: Expense): Promise<void> {
  await getDatabase().runAsync(
    `INSERT INTO expenses
      (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    expense.createdAt
  );
}

export async function addExpenses(expenses: Expense[]): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    for (const expense of expenses) {
      await db.runAsync(
        `INSERT INTO expenses
          (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        expense.createdAt
      );
    }
  });
}

/** Updates an existing expense record on this device. */
export async function updateExpense(expense: Expense): Promise<void> {
  const result = await getDatabase().runAsync(
    `UPDATE expenses
     SET title = ?, amount = ?, quantity = ?, unit = ?, category = ?, subcategory = ?,
         date = ?, paid_by = ?, notes = ?
     WHERE id = ?`,
    expense.title.trim(),
    expense.amount,
    expense.quantity,
    expense.unit.trim(),
    expense.category,
    expense.subcategory,
    expense.date,
    expense.paidBy,
    expense.notes.trim(),
    expense.id
  );
  if (result.changes === 0) {
    throw new Error('Expense could not be found.');
  }
}

export async function removeExpense(id: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM expenses WHERE id = ?', id);
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
      'SELECT COUNT(*) AS count FROM expenses'
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

    for (const member of backup.members) {
      const result = await db.runAsync(
        'INSERT OR IGNORE INTO members (id, name) VALUES (?, ?)',
        member.id,
        member.name
      );
      membersAdded += result.changes;
    }
    for (const expense of backup.expenses) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO expenses
          (id, title, amount, quantity, unit, category, subcategory, date, paid_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        expense.createdAt
      );
      expensesAdded += result.changes;
    }
  });

  return { expensesAdded, membersAdded, currencyChanged };
}
