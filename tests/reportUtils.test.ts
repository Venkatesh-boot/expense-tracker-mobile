import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChart,
  buildMonthComparison,
  buildReportMetrics,
  buildYearComparison,
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


test('buildMonthComparison returns 12 months with correct deltas and flags', () => {
  // Create expenses across 3 months
  const expenses: Expense[] = [
    makeExpense('1', '2026-09-05', 300, 'm1'),
    makeExpense('2', '2026-09-15', 200, 'm1'),
    makeExpense('3', '2026-10-10', 600, 'm1'),
    makeExpense('4', '2026-11-05', 400, 'm1'),
    makeExpense('5', '2026-11-20', 100, 'm2'),
  ];

  const now = new Date(2026, 10, 27, 14, 0, 0); // 27 Nov 2026
  const result = buildMonthComparison(expenses, now, 12);

  assert.equal(result.length, 12);

  // Last item should be current month (Nov 2026)
  const nov = result[result.length - 1];
  assert.equal(nov.monthKey, '2026-11');
  assert.equal(nov.isCurrent, true);
  assert.equal(nov.total, 500);
  assert.equal(nov.count, 2);

  // Oct 2026
  const oct = result[result.length - 2];
  assert.equal(oct.monthKey, '2026-10');
  assert.equal(oct.total, 600);
  assert.equal(oct.isCurrent, false);

  // Nov delta vs Oct: 500 - 600 = -100
  assert.equal(nov.deltaVsPrev, -100);
  assert.equal(nov.deltaPercent, -17);

  // Sep 2026
  const sep = result[result.length - 3];
  assert.equal(sep.monthKey, '2026-09');
  assert.equal(sep.total, 500);

  // First month has no delta (no predecessor)
  assert.equal(result[0].deltaVsPrev, null);
  assert.equal(result[0].deltaPercent, null);
});

test('buildYearComparison groups by year with monthly breakdowns and deltas', () => {
  const expenses: Expense[] = [
    makeExpense('1', '2025-03-10', 1000, 'm1'),
    makeExpense('2', '2025-06-15', 2000, 'm1'),
    makeExpense('3', '2025-06-20', 500, 'm2'),
    makeExpense('4', '2026-01-05', 800, 'm1'),
    makeExpense('5', '2026-04-10', 1200, 'm1'),
    makeExpense('6', '2026-11-25', 3000, 'm1'),
  ];

  const now = new Date(2026, 10, 27, 14, 0, 0);
  const result = buildYearComparison(expenses, now);

  assert.equal(result.length, 2);

  // 2025 year
  const y2025 = result[0];
  assert.equal(y2025.year, 2025);
  assert.equal(y2025.total, 3500);
  assert.equal(y2025.count, 3);
  assert.equal(y2025.isCurrent, false);
  assert.equal(y2025.deltaVsPrev, null);
  assert.equal(y2025.months.length, 12);
  // March = 1000
  assert.equal(y2025.months[2].total, 1000);
  assert.equal(y2025.months[2].label.toLowerCase().includes('mar'), true);
  // June = 2500
  assert.equal(y2025.months[5].total, 2500);

  // 2026 year
  const y2026 = result[1];
  assert.equal(y2026.year, 2026);
  assert.equal(y2026.total, 5000);
  assert.equal(y2026.count, 3);
  assert.equal(y2026.isCurrent, true);
  assert.equal(y2026.deltaVsPrev, 1500);
  assert.equal(y2026.deltaPercent, 43); // Math.round((1500/3500)*100) = 43
  // Monthly average: 5000 / 3 active months = ~1666.67
  assert.equal(Math.round(y2026.monthlyAverage), 1667);
});
