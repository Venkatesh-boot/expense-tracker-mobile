import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSyncSnapshots, parseSyncSnapshot } from '../src/syncUtils.js';
import type { SyncExpenseRecord, SyncMemberRecord, SyncSnapshot } from '../src/domain.js';

function makeMember(
  id: string,
  name: string,
  updatedAt = '2026-11-20T10:00:00.000Z'
): SyncMemberRecord {
  return { id, name, updatedAt };
}

function makeExpense(
  overrides: Partial<SyncExpenseRecord> & { id: string }
): SyncExpenseRecord {
  return {
    title: 'Chicken',
    amount: 320,
    quantity: 1,
    unit: 'kg',
    category: 'Groceries',
    subcategory: 'Chicken',
    date: '2026-11-26',
    paidBy: 'm1',
    notes: '',
    createdAt: '2026-11-26T08:00:00.000Z',
    updatedAt: '2026-11-26T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<SyncSnapshot> = {}): SyncSnapshot {
  return {
    app: 'family-expense-tracker',
    syncVersion: 1,
    deviceId: 'device-a',
    exportedAt: '2026-11-26T12:00:00.000Z',
    currency: 'INR',
    members: [makeMember('m1', 'Venkatesh')],
    expenses: [],
    ...overrides,
  };
}

test('mergeSyncSnapshots combines new members and expenses from both devices', () => {
  const local = makeSnapshot({
    deviceId: 'phone-a',
    members: [makeMember('m1', 'Venkatesh')],
    expenses: [makeExpense({ id: 'e1', title: 'Mutton', amount: 750, paidBy: 'm1' })],
  });
  const remote = makeSnapshot({
    deviceId: 'phone-b',
    members: [makeMember('m2', 'Priya')],
    expenses: [makeExpense({ id: 'e2', title: 'Milk', amount: 68, paidBy: 'm2' })],
  });

  const result = mergeSyncSnapshots(local, remote);
  assert.equal(result.snapshot.members.length, 2);
  assert.equal(result.snapshot.expenses.length, 2);
  assert.equal(result.stats.membersAdded, 1);
  assert.equal(result.stats.expensesAdded, 1);
  assert.equal(result.stats.expensesUpdated, 0);
  assert.equal(result.stats.expensesDeleted, 0);
});

test('mergeSyncSnapshots resolves edits and deletes via Last-Write-Wins updatedAt', () => {
  const local = makeSnapshot({
    members: [makeMember('m1', 'You', '2026-11-20T10:00:00.000Z')],
    expenses: [
      makeExpense({
        id: 'e1',
        amount: 300,
        updatedAt: '2026-11-26T09:00:00.000Z',
      }),
      makeExpense({
        id: 'e2',
        title: 'Duplicate Tea',
        updatedAt: '2026-11-26T08:00:00.000Z',
      }),
    ],
  });
  const remote = makeSnapshot({
    deviceId: 'phone-b',
    members: [makeMember('m1', 'Venkatesh', '2026-11-25T11:00:00.000Z')],
    expenses: [
      makeExpense({
        id: 'e1',
        amount: 340,
        updatedAt: '2026-11-26T10:30:00.000Z',
      }),
      makeExpense({
        id: 'e2',
        title: 'Duplicate Tea',
        updatedAt: '2026-11-26T10:45:00.000Z',
        deletedAt: '2026-11-26T10:45:00.000Z',
      }),
    ],
  });

  const result = mergeSyncSnapshots(local, remote);
  assert.equal(result.stats.membersUpdated, 1);
  assert.equal(result.snapshot.members[0].name, 'Venkatesh');
  const e1 = result.snapshot.expenses.find((e) => e.id === 'e1');
  const e2 = result.snapshot.expenses.find((e) => e.id === 'e2');
  assert.equal(e1?.amount, 340);
  assert.equal(e2?.deletedAt, '2026-11-26T10:45:00.000Z');
  assert.equal(result.stats.expensesUpdated, 1);
  assert.equal(result.stats.expensesDeleted, 1);
});

test('mergeSyncSnapshots adopts currency on empty device and rejects mismatched non-empty currencies', () => {
  const emptyLocal = makeSnapshot({ currency: 'INR', expenses: [] });
  const usdRemote = makeSnapshot({
    deviceId: 'phone-b',
    currency: 'USD',
    expenses: [makeExpense({ id: 'e1', amount: 12 })],
  });

  const adopted = mergeSyncSnapshots(emptyLocal, usdRemote);
  assert.equal(adopted.snapshot.currency, 'USD');
  assert.equal(adopted.stats.currencyAdopted, true);

  const nonEmptyInr = makeSnapshot({
    currency: 'INR',
    expenses: [makeExpense({ id: 'e2', amount: 250 })],
  });
  assert.throws(
    () => mergeSyncSnapshots(nonEmptyInr, usdRemote),
    /same currency before syncing/
  );
});

test('parseSyncSnapshot validates payloads and defaults optional fields safely', () => {
  const parsed = parseSyncSnapshot({
    app: 'family-expense-tracker',
    syncVersion: 1,
    deviceId: 'phone-b',
    currency: 'INR',
    members: [{ id: 'm2', name: 'Priya' }],
    expenses: [
      {
        id: 'e1',
        title: 'Tomatoes',
        amount: 45,
        category: 'Groceries',
        date: '2026-11-26',
        paidBy: 'm2',
      },
    ],
  });
  assert.equal(parsed.members[0].updatedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(parsed.expenses[0].deletedAt, null);
  assert.equal(parsed.expenses[0].unit, 'item');

  assert.throws(
    () => parseSyncSnapshot({ app: 'other', syncVersion: 1 }),
    /incompatible sync format/
  );
});
