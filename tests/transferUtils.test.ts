import test from 'node:test';
import assert from 'node:assert/strict';
import { formatExpensesCsv, parseBackup } from '../src/transferUtils';
import type { BackupDocument } from '../src/domain';

const VALID_BACKUP: BackupDocument = {
  app: 'family-expense-tracker',
  version: 2,
  exportedAt: '2026-11-25T10:00:00.000Z',
  preferences: { currency: 'USD', displayName: 'Alex' },
  members: [{ id: 'm1', name: 'Alex' }],
  expenses: [
    {
      id: 'e1',
      title: 'Coffee',
      amount: 4.5,
      quantity: 1,
      unit: 'cup',
      category: 'Food',
      subcategory: 'Cafe',
      date: '2026-11-25',
      paidBy: 'm1',
      notes: 'Morning latte',
      createdAt: '2026-11-25T08:00:00.000Z',
    },
  ],
};

test('parseBackup accepts valid version 2 backup', () => {
  const parsed = parseBackup(JSON.stringify(VALID_BACKUP));
  assert.equal(parsed.members.length, 1);
  assert.equal(parsed.expenses[0].title, 'Coffee');
  assert.equal(parsed.preferences.currency, 'USD');
});

test('parseBackup rejects unknown paidBy member references', () => {
  const invalid = {
    ...VALID_BACKUP,
    expenses: [{ ...VALID_BACKUP.expenses[0], paidBy: 'missing-member' }],
  };
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /unknown family member/i);
});

test('parseBackup rejects invalid calendar dates', () => {
  const invalid = {
    ...VALID_BACKUP,
    expenses: [{ ...VALID_BACKUP.expenses[0], date: '2026-02-31' }],
  };
  assert.throws(() => parseBackup(JSON.stringify(invalid)), /invalid expense record/i);
});

test('formatExpensesCsv escapes commas, quotes, and formula prefixes', () => {
  const csv = formatExpensesCsv(
    [
      {
        ...VALID_BACKUP.expenses[0],
        title: '=HYPERLINK("bad")',
        notes: 'Line, "quoted"',
      },
    ],
    VALID_BACKUP.members,
    'USD'
  );
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Amount \(USD\)/);
  assert.ok(lines[1].includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(lines[1].includes('"Line, ""quoted"""'));
});
