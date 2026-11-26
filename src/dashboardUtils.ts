import {
  CATEGORIES,
  formatMoney,
  getCurrencyLocale,
  todayString,
} from './domain';
import type {
  Expense,
  ExpenseCategory,
  FamilyMember,
  Preferences,
} from './domain';

export type BudgetStatus = {
  limit: number;
  usedPercent: number;
  remaining: number;
  safeDailyPace: number;
  tone: 'on_track' | 'near_limit' | 'over_budget';
};

export type DashboardCategoryItem = {
  category: ExpenseCategory;
  count: number;
  total: number;
  percent: number;
  topSubcategory: string;
};

export type DashboardMemberItem = {
  id: string;
  name: string;
  count: number;
  total: number;
  percent: number;
  deltaFromEqual: number;
};

export type DashboardDayPoint = {
  date: string;
  label: string;
  total: number;
  count: number;
};

export type DashboardMonthPoint = {
  monthKey: string;
  label: string;
  total: number;
  count: number;
  isCurrent: boolean;
};

export type DashboardInsight = {
  id: string;
  tone: 'positive' | 'warning' | 'neutral';
  text: string;
};

export type DashboardSummary = {
  todayKey: string;
  monthLabel: string;
  prevMonthLabel: string;
  monthTotal: number;
  monthCount: number;
  categoryCount: number;
  todayTotal: number;
  todayCount: number;
  thisWeekTotal: number;
  thisWeekCount: number;
  dailyAverage: number;
  projectedMonthTotal: number;
  averageTicket: number;
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  activeSpendDays: number;
  noSpendDays: number;
  prevMonthTotal: number;
  prevMonthMtdTotal: number;
  momDeltaAmount: number;
  momDeltaPercent: number | null;
  budget: BudgetStatus | null;
  largestExpense: Expense | null;
  topPurchases: Expense[];
  categoryTotals: DashboardCategoryItem[];
  maxCategory: number;
  memberTotals: DashboardMemberItem[];
  maxMember: number;
  equalMemberShare: number;
  weekSpending: DashboardDayPoint[];
  weekTotal: number;
  weekDailyAverage: number;
  maxDay: number;
  peakWeekDay: DashboardDayPoint | null;
  sixMonthSpending: DashboardMonthPoint[];
  sixMonthAverage: number;
  maxSixMonth: number;
  insights: DashboardInsight[];
  recent: Expense[];
};

/** Computes rich monthly, weekly, budget, family, and trend analytics for the dashboard. */
export function buildDashboardSummary(
  expenses: Expense[],
  members: FamilyMember[],
  preferences: Preferences,
  now = new Date()
): DashboardSummary {
  const locale = getCurrencyLocale(preferences.currency);
  const todayKey = todayString(now);
  const monthPrefix = todayKey.slice(0, 7);
  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = todayString(prevMonthDate).slice(0, 7);
  const prevMonthLastDay = new Date(
    prevMonthDate.getFullYear(),
    prevMonthDate.getMonth() + 1,
    0
  ).getDate();
  const prevMtdCutoff = `${prevMonthPrefix}-${String(
    Math.min(daysElapsed, prevMonthLastDay)
  ).padStart(2, '0')}`;

  const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (weekStartDate.getDay() + 6) % 7;
  weekStartDate.setDate(weekStartDate.getDate() - daysSinceMonday);
  const weekStartKey = todayString(weekStartDate);

  const thisMonth: Expense[] = [];
  const prevMonth: Expense[] = [];
  let todayTotal = 0;
  let todayCount = 0;
  let thisWeekTotal = 0;
  let thisWeekCount = 0;

  for (const expense of expenses) {
    if (expense.date.startsWith(monthPrefix)) {
      thisMonth.push(expense);
    } else if (expense.date.startsWith(prevMonthPrefix)) {
      prevMonth.push(expense);
    }
    if (expense.date === todayKey) {
      todayTotal += expense.amount;
      todayCount += 1;
    }
    if (expense.date >= weekStartKey && expense.date <= todayKey) {
      thisWeekTotal += expense.amount;
      thisWeekCount += 1;
    }
  }

  const monthTotal = sumAmounts(thisMonth);
  const monthCount = thisMonth.length;
  const dailyAverage = monthTotal / daysElapsed;
  const projectedMonthTotal = dailyAverage * daysInMonth;
  const averageTicket = monthCount > 0 ? monthTotal / monthCount : 0;

  const prevMonthTotal = sumAmounts(prevMonth);
  const prevMonthMtdTotal = sumAmounts(
    prevMonth.filter((expense) => expense.date <= prevMtdCutoff)
  );
  const momDeltaAmount = monthTotal - prevMonthMtdTotal;
  const momDeltaPercent =
    prevMonthMtdTotal > 0
      ? Math.round((momDeltaAmount / prevMonthMtdTotal) * 100)
      : null;

  const activeDateSet = new Set(
    thisMonth
      .filter((expense) => expense.date <= todayKey && expense.amount > 0)
      .map((expense) => expense.date)
  );
  const activeSpendDays = activeDateSet.size;
  const noSpendDays = Math.max(0, daysElapsed - activeSpendDays);

  const budget = buildBudgetStatus(
    preferences.monthlyBudget,
    monthTotal,
    daysRemaining
  );

  const categoryTotals = buildCategoryBreakdown(thisMonth, monthTotal);
  const memberTotals = buildMemberBreakdown(thisMonth, members, monthTotal);
  const equalMemberShare =
    memberTotals.length > 0 ? monthTotal / memberTotals.length : monthTotal;

  const sortedByAmount = [...thisMonth].sort((a, b) => b.amount - a.amount);
  const largestExpense = sortedByAmount[0] ?? null;
  const topPurchases = sortedByAmount.slice(0, 3);

  const weekSpending = buildWeekSeries(expenses, now, locale);
  const weekTotal = weekSpending.reduce((sum, day) => sum + day.total, 0);
  const peakWeekDay =
    weekSpending.reduce<DashboardDayPoint | null>(
      (best, day) => (day.total > 0 && (!best || day.total > best.total) ? day : best),
      null
    );

  const sixMonthSpending = buildSixMonthSeries(expenses, now, locale, monthPrefix);
  const sixMonthActive = sixMonthSpending.filter((item) => item.total > 0);
  const sixMonthAverage =
    sixMonthActive.length > 0
      ? sixMonthActive.reduce((sum, item) => sum + item.total, 0) / sixMonthActive.length
      : 0;

  const insights = buildInsights({
    currency: preferences.currency,
    monthTotal,
    prevMonthMtdTotal,
    prevMonthLabel: prevMonthDate.toLocaleDateString(locale, { month: 'short' }),
    momDeltaAmount,
    momDeltaPercent,
    budget,
    daysElapsed,
    daysRemaining,
    noSpendDays,
    categoryTotals,
    thisMonth,
  });

  return {
    todayKey,
    monthLabel: now.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    prevMonthLabel: prevMonthDate.toLocaleDateString(locale, { month: 'short' }),
    monthTotal,
    monthCount,
    categoryCount: categoryTotals.length,
    todayTotal,
    todayCount,
    thisWeekTotal,
    thisWeekCount,
    dailyAverage,
    projectedMonthTotal,
    averageTicket,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    activeSpendDays,
    noSpendDays,
    prevMonthTotal,
    prevMonthMtdTotal,
    momDeltaAmount,
    momDeltaPercent,
    budget,
    largestExpense,
    topPurchases,
    categoryTotals,
    maxCategory: Math.max(1, ...categoryTotals.map((item) => item.total)),
    memberTotals,
    maxMember: Math.max(1, ...memberTotals.map((item) => item.total)),
    equalMemberShare,
    weekSpending,
    weekTotal,
    weekDailyAverage: weekTotal / 7,
    maxDay: Math.max(1, ...weekSpending.map((day) => day.total)),
    peakWeekDay,
    sixMonthSpending,
    sixMonthAverage,
    maxSixMonth: Math.max(1, ...sixMonthSpending.map((month) => month.total)),
    insights,
    recent: expenses.slice(0, 5),
  };
}

function sumAmounts(items: Expense[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function buildBudgetStatus(
  monthlyBudget: number | undefined,
  monthTotal: number,
  daysRemaining: number
): BudgetStatus | null {
  if (!monthlyBudget || !Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return null;
  }
  const usedPercent = Math.round((monthTotal / monthlyBudget) * 100);
  const remaining = monthlyBudget - monthTotal;
  const safeDailyPace =
    remaining <= 0
      ? 0
      : daysRemaining > 0
        ? remaining / daysRemaining
        : remaining;
  const tone: BudgetStatus['tone'] =
    monthTotal > monthlyBudget
      ? 'over_budget'
      : usedPercent >= 80
        ? 'near_limit'
        : 'on_track';
  return {
    limit: monthlyBudget,
    usedPercent,
    remaining,
    safeDailyPace,
    tone,
  };
}

function buildCategoryBreakdown(
  monthExpenses: Expense[],
  monthTotal: number
): DashboardCategoryItem[] {
  return CATEGORIES.map((category) => {
    const items = monthExpenses.filter((expense) => expense.category === category);
    const total = sumAmounts(items);
    const subTotals = new Map<string, number>();
    for (const item of items) {
      subTotals.set(item.subcategory, (subTotals.get(item.subcategory) || 0) + item.amount);
    }
    const topSubcategory =
      [...subTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return {
      category,
      count: items.length,
      total,
      percent: monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0,
      topSubcategory,
    };
  })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

function buildMemberBreakdown(
  monthExpenses: Expense[],
  members: FamilyMember[],
  monthTotal: number
): DashboardMemberItem[] {
  const buckets = new Map<string, { id: string; name: string; count: number; total: number }>();
  for (const member of members) {
    buckets.set(member.id, { id: member.id, name: member.name, count: 0, total: 0 });
  }
  for (const expense of monthExpenses) {
    const existing = buckets.get(expense.paidBy);
    if (existing) {
      existing.count += 1;
      existing.total += expense.amount;
    } else {
      buckets.set(expense.paidBy, {
        id: expense.paidBy,
        name: 'Family',
        count: 1,
        total: expense.amount,
      });
    }
  }
  const activeCount = buckets.size;
  const equalShare = activeCount > 0 ? monthTotal / activeCount : monthTotal;
  return [...buckets.values()]
    .map((item) => ({
      ...item,
      percent: monthTotal > 0 ? Math.round((item.total / monthTotal) * 100) : 0,
      deltaFromEqual: item.total - equalShare,
    }))
    .sort((a, b) => b.total - a.total);
}

function buildWeekSeries(
  expenses: Expense[],
  now: Date,
  locale: string
): DashboardDayPoint[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    const existing = totals.get(expense.date);
    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
    } else {
      totals.set(expense.date, { total: expense.amount, count: 1 });
    }
  }

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    const date = todayString(day);
    const entry = totals.get(date);
    return {
      date,
      label: day.toLocaleDateString(locale, { weekday: 'short' }),
      total: entry?.total ?? 0,
      count: entry?.count ?? 0,
    };
  });
}

function buildSixMonthSeries(
  expenses: Expense[],
  now: Date,
  locale: string,
  currentMonthPrefix: string
): DashboardMonthPoint[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    const key = expense.date.slice(0, 7);
    const existing = totals.get(key);
    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
    } else {
      totals.set(key, { total: expense.amount, count: 1 });
    }
  }

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const monthKey = todayString(monthDate).slice(0, 7);
    const entry = totals.get(monthKey);
    return {
      monthKey,
      label: monthDate.toLocaleDateString(locale, { month: 'short' }),
      total: entry?.total ?? 0,
      count: entry?.count ?? 0,
      isCurrent: monthKey === currentMonthPrefix,
    };
  });
}

function buildInsights({
  currency,
  monthTotal,
  prevMonthMtdTotal,
  prevMonthLabel,
  momDeltaAmount,
  momDeltaPercent,
  budget,
  daysElapsed,
  daysRemaining,
  noSpendDays,
  categoryTotals,
  thisMonth,
}: {
  currency: Preferences['currency'];
  monthTotal: number;
  prevMonthMtdTotal: number;
  prevMonthLabel: string;
  momDeltaAmount: number;
  momDeltaPercent: number | null;
  budget: BudgetStatus | null;
  daysElapsed: number;
  daysRemaining: number;
  noSpendDays: number;
  categoryTotals: DashboardCategoryItem[];
  thisMonth: Expense[];
}): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (budget) {
    if (budget.tone === 'over_budget') {
      insights.push({
        id: 'budget',
        tone: 'warning',
        text: `Over your monthly budget by ${formatMoney(Math.abs(budget.remaining), currency)} (${budget.usedPercent}% used).`,
      });
    } else if (budget.tone === 'near_limit') {
      insights.push({
        id: 'budget',
        tone: 'warning',
        text: `${budget.usedPercent}% of budget used with ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left (${formatMoney(budget.safeDailyPace, currency)}/day safe pace).`,
      });
    } else {
      insights.push({
        id: 'budget',
        tone: 'positive',
        text: `On track: ${formatMoney(budget.remaining, currency)} left (${formatMoney(budget.safeDailyPace, currency)}/day safe pace).`,
      });
    }
  }

  if (momDeltaPercent !== null && prevMonthMtdTotal > 0) {
    if (momDeltaAmount <= 0) {
      insights.push({
        id: 'mom',
        tone: 'positive',
        text: `${Math.abs(momDeltaPercent)}% lower than ${prevMonthLabel} by day ${daysElapsed} (${formatMoney(Math.abs(momDeltaAmount), currency)} less).`,
      });
    } else {
      insights.push({
        id: 'mom',
        tone: momDeltaPercent >= 15 ? 'warning' : 'neutral',
        text: `${momDeltaPercent}% higher than ${prevMonthLabel} by day ${daysElapsed} (+${formatMoney(momDeltaAmount, currency)}).`,
      });
    }
  }

  if (categoryTotals.length > 0 && monthTotal > 0) {
    const top = categoryTotals[0];
    const subNote = top.topSubcategory ? `, led by ${top.topSubcategory}` : '';
    insights.push({
      id: 'top-category',
      tone: 'neutral',
      text: `${top.category} drives ${top.percent}% of spending (${formatMoney(top.total, currency)})${subNote}.`,
    });
  }

  if (thisMonth.length > 0 && insights.length < 3) {
    insights.push({
      id: 'no-spend',
      tone: noSpendDays >= Math.ceil(daysElapsed / 2) ? 'positive' : 'neutral',
      text: `${noSpendDays} no-spend ${noSpendDays === 1 ? 'day' : 'days'} out of ${daysElapsed} ${daysElapsed === 1 ? 'day' : 'days'} this month.`,
    });
  }

  return insights.slice(0, 3);
}
