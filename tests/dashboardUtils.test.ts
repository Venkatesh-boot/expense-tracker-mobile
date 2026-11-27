import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardSummary, buildDonutSegments } from '../src/dashboardUtils';
import type { Expense, FamilyMember, Preferences } from '../src/domain';

const MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Alex' },
  { id: 'm2', name: 'Sam' },
];

const PREFS: Preferences = {
  currency: 'USD',
  displayName: 'Alex',
  selfId: 'm1',
  monthlyBudget: 1000,
};

function makeExpense(overrides: Partial<Expense> & { id: string; date: string; amount: number }): Expense {
  return {
    title: 'Sample',
    quantity: 1,
    unit: 'pc',
    category: 'Groceries',
    subcategory: 'Pantry',
    paidBy: 'm1',
    notes: '',
    createdAt: `${overrides.date}T10:00:00.000Z`,
    ...overrides,
  };
}

test('buildDashboardSummary computes totals, MoM pace, budget, and top purchases', () => {
  const now = new Date(2026, 10, 10, 12, 0, 0); // 2026-11-10 (Tuesday)
  const expenses: Expense[] = [
    makeExpense({ id: '1', date: '2026-11-10', amount: 150, title: 'Weekly Groceries', category: 'Groceries', subcategory: 'Dairy & bakery', paidBy: 'm1' }),
    makeExpense({ id: '2', date: '2026-11-09', amount: 300, title: 'Electric Bill', category: 'Bills', subcategory: 'Electricity', paidBy: 'm2' }),
    makeExpense({ id: '3', date: '2026-11-02', amount: 50, title: 'Coffee', category: 'Food', subcategory: 'Cafe', paidBy: 'm1' }),
    // Previous month within first 10 days (MTD cutoff 2026-10-10)
    makeExpense({ id: '4', date: '2026-10-08', amount: 400, title: 'Oct Groceries', paidBy: 'm1' }),
    // Previous month after day 10 (excluded from MTD comparison, included in prevMonthTotal & 6M chart)
    makeExpense({ id: '5', date: '2026-10-20', amount: 200, title: 'Oct Fuel', paidBy: 'm2' }),
  ];

  const summary = buildDashboardSummary(expenses, MEMBERS, PREFS, now);

  assert.equal(summary.monthTotal, 500);
  assert.equal(summary.monthCount, 3);
  assert.equal(summary.todayTotal, 150);
  assert.equal(summary.todayCount, 1);
  assert.equal(summary.todayExpenses.length, 1);
  assert.equal(summary.todayExpenses[0].id, '1');
  assert.equal(summary.todayTopCategory?.category, 'Groceries');
  assert.equal(summary.yesterdayTotal, 300);
  assert.equal(summary.thisWeekTotal, 450); // Mon Nov 9 + Tue Nov 10
  assert.equal(summary.dailyAverage, 50);
  assert.equal(summary.projectedMonthTotal, 1500); // 50 * 30 days in Nov
  assert.equal(summary.activeSpendDays, 3);
  assert.equal(summary.noSpendDays, 7);

  // MoM vs Oct 1-10 (400 -> 500 = +25%)
  assert.equal(summary.prevMonthMtdTotal, 400);
  assert.equal(summary.prevMonthTotal, 600);
  assert.equal(summary.momDeltaAmount, 100);
  assert.equal(summary.momDeltaPercent, 25);

  // Budget (500 / 1000 = 50% used, 500 remaining over 20 days left = 25/day)
  assert.ok(summary.budget);
  assert.equal(summary.budget.usedPercent, 50);
  assert.equal(summary.budget.remaining, 500);
  assert.equal(summary.budget.safeDailyPace, 25);
  assert.equal(summary.budget.tone, 'on_track');

  // Top purchases sorted descending
  assert.equal(summary.topPurchases[0].id, '2');
  assert.equal(summary.largestExpense?.id, '2');

  // Category breakdown includes topSubcategory
  assert.equal(summary.categoryTotals[0].category, 'Bills');
  assert.equal(summary.categoryTotals[0].topSubcategory, 'Electricity');

  // Family split (equal share = 250; Sam paid 300 => +50, Alex paid 200 => -50)
  assert.equal(summary.equalMemberShare, 250);
  assert.equal(summary.memberTotals[0].name, 'Sam');
  assert.equal(summary.memberTotals[0].deltaFromEqual, 50);
  assert.equal(summary.memberTotals[1].name, 'Alex');
  assert.equal(summary.memberTotals[1].deltaFromEqual, -50);

  // 6-month series ends with Nov (500) preceded by Oct (600)
  assert.equal(summary.sixMonthSpending.length, 6);
  assert.equal(summary.sixMonthSpending[5].monthKey, '2026-11');
  assert.equal(summary.sixMonthSpending[5].total, 500);
  assert.equal(summary.sixMonthSpending[4].monthKey, '2026-10');
  assert.equal(summary.sixMonthSpending[4].total, 600);
});

test('buildDashboardSummary handles over-budget and empty history gracefully', () => {
  const now = new Date(2026, 1, 28, 12, 0, 0); // 2026-02-28 (last day of Feb)
  const expenses: Expense[] = [
    makeExpense({ id: '1', date: '2026-02-28', amount: 1200, title: 'Rent' }),
  ];

  const summary = buildDashboardSummary(expenses, MEMBERS, PREFS, now);
  assert.ok(summary.budget);
  assert.equal(summary.budget.tone, 'over_budget');
  assert.equal(summary.budget.remaining, -200);
  assert.equal(summary.budget.safeDailyPace, 0);
  assert.equal(summary.momDeltaPercent, null);
  assert.ok(summary.insights.some((item) => item.id === 'budget' && item.tone === 'warning'));
});

test('buildDonutSegments splits >180deg slices and covers 360deg', () => {
  const segments = buildDonutSegments([
    { value: 75, color: '#226D5A' },
    { value: 25, color: '#528AC7' },
  ]);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].sliceIndex, 0);
  assert.equal(segments[0].startAngle, 0);
  assert.equal(segments[0].sweepAngle, 180.5);
  assert.equal(segments[1].sliceIndex, 0);
  assert.equal(segments[1].startAngle, 180);
  assert.equal(segments[1].sweepAngle, 90);
  assert.equal(segments[2].sliceIndex, 1);
  assert.equal(segments[2].startAngle, 270);
  assert.equal(segments[2].sweepAngle, 90);

  assert.deepEqual(buildDonutSegments([]), []);
});

test('buildDashboardSummary builds cumulative pace against previous month and budget', () => {
  const now = new Date(2026, 10, 4, 12, 0, 0); // 2026-11-04
  const expenses: Expense[] = [
    makeExpense({ id: '1', date: '2026-11-01', amount: 100 }),
    makeExpense({ id: '2', date: '2026-11-03', amount: 150 }),
    makeExpense({ id: '3', date: '2026-10-02', amount: 80 }),
  ];

  const withPrev = buildDashboardSummary(expenses, MEMBERS, PREFS, now);
  assert.equal(withPrev.cumulativePace.comparisonKind, 'prev_month');
  assert.equal(withPrev.cumulativePace.points.length, 4);
  assert.equal(withPrev.cumulativePace.points[0].actual, 100);
  assert.equal(withPrev.cumulativePace.points[2].actual, 250);
  assert.equal(withPrev.cumulativePace.points[2].comparison, 80);

  const budgetOnly = buildDashboardSummary(expenses.slice(0, 2), MEMBERS, PREFS, now);
  assert.equal(budgetOnly.cumulativePace.comparisonKind, 'budget');
  assert.equal(Math.round(budgetOnly.cumulativePace.points[2].comparison ?? 0), 100);
});
