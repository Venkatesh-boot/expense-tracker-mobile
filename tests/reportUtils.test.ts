import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, getBounds } from '../src/reportUtils';
import type { Expense } from '../src/domain';

function makeExpense(id: string, date: string, amount: number, paidBy = 'm1'): Expense {
  return {
    id,
    title: `Item ${id}`,
    amount,
    quantity: 1,
    unit: 'pc',
    category: 'Groceries',
    subcategory: 'Pantry',
    date,
    paidBy,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

test('getBounds swaps inverted custom dates', () => {
  const bounds = getBounds('custom', '2026-11-25', '2026-11-01');
  assert.deepEqual(bounds, { start: '2026-11-01', end: '2026-11-25' });
});

test('buildChart keeps all daily buckets for a full month without truncating to 12', () => {
  const expenses = Array.from({ length: 20 }, (_, i) =>
    makeExpense(`e${i}`, `2026-11-${String(i + 1).padStart(2, '0')}`, 10)
  );
  const chart = buildChart(expenses, 'trend', 'month', '2026-11-01', '2026-11-30');
  assert.equal(chart.length, 20);
  const chartedTotal = chart.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(chartedTotal, 200);
});

test('buildChart aggregates by member using memberNames lookup', () => {
  const expenses = [
    makeExpense('1', '2026-11-10', 40, 'm1'),
    makeExpense('2', '2026-11-11', 90, 'm2'),
    makeExpense('3', '2026-11-12', 10, 'm1'),
  ];
  const memberNames = new Map([
    ['m1', 'Alex'],
    ['m2', 'Sam'],
  ]);
  const chart = buildChart(expenses, 'member', 'month', '2026-11-01', '2026-11-30', memberNames);
  assert.deepEqual(chart, [
    { label: 'Sam', amount: 90 },
    { label: 'Alex', amount: 50 },
  ]);
});
