import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChart,
  buildReportMetrics,
  getBounds,
  groupExpensesByDay,
} from '../src/reportUtils';
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

test('groupExpensesByDay groups and sorts expenses newest day first with today/yesterday flags', () => {
  const now = new Date(2026, 10, 27, 13, 0, 0);
  const expenses: Expense[] = [
    makeExpense('1', '2026-11-25', 200, 'm1'),
    makeExpense('2', '2026-11-27', 150, 'm1'),
    makeExpense('3', '2026-11-27', 50, 'm2'),
    makeExpense('4', '2026-11-26', 100, 'm2'),
  ];

  const groups = groupExpensesByDay(expenses, now);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].date, '2026-11-27');
  assert.equal(groups[0].isToday, true);
  assert.equal(groups[0].total, 200);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].percentOfTotal, 40);

  assert.equal(groups[1].date, '2026-11-26');
  assert.equal(groups[1].isYesterday, true);
  assert.equal(groups[1].total, 100);

  assert.equal(groups[2].date, '2026-11-25');
  assert.equal(groups[2].isToday, false);
  assert.equal(groups[2].isYesterday, false);

  const memberNames = new Map([
    ['m1', 'Alex'],
    ['m2', 'Sam'],
  ]);
  const metrics = buildReportMetrics(expenses, groups, memberNames);
  assert.equal(metrics.total, 500);
  assert.equal(metrics.activeDays, 3);
  assert.equal(Math.round(metrics.averagePerDay), 167);
  assert.equal(metrics.peakDay?.total, 200);
  assert.equal(metrics.topMember?.name, 'Alex');
});
