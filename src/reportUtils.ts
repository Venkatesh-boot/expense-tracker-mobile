import { displayDate, formatMonthLabel, todayString } from './domain';
import type { Expense, ExpenseCategory } from './domain';

export type ReportRange = 'day' | 'week' | 'month' | 'year' | 'custom';
export type ChartDimension = 'trend' | 'category' | 'subcategory' | 'product' | 'member';

export type ReportDayGroup = {
  date: string;
  label: string;
  weekday: string;
  isToday: boolean;
  isYesterday: boolean;
  total: number;
  count: number;
  percentOfTotal: number;
  items: Expense[];
};

export type ReportMetrics = {
  total: number;
  count: number;
  activeDays: number;
  averagePerDay: number;
  averagePerEntry: number;
  peakDay: { date: string; label: string; total: number } | null;
  topCategory: { category: ExpenseCategory; total: number; percent: number } | null;
  topMember: { name: string; total: number; percent: number } | null;
};

export function getBounds(
  range: ReportRange,
  customStart: string,
  customEnd: string,
  today = new Date()
): { start: string; end: string } {
  const end = todayString(today);
  if (range === 'custom') {
    return customStart <= customEnd
      ? { start: customStart, end: customEnd }
      : { start: customEnd, end: customStart };
  }
  if (range === 'day') return { start: end, end };
  if (range === 'week') {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return { start: toDateKey(start), end };
  }
  if (range === 'year') return { start: `${today.getFullYear()}-01-01`, end };
  return {
    start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    end,
  };
}

/** Builds chart bars without silently truncating earlier trend data. */
export function buildChart(
  expenses: Expense[],
  dimension: ChartDimension,
  range: ReportRange,
  start: string,
  end: string,
  memberNames?: Map<string, string>
): { label: string; amount: number }[] {
  const totals = new Map<string, number>();
  const aggregate = (key: string, amount: number) => {
    totals.set(key, (totals.get(key) || 0) + amount);
  };

  if (dimension === 'trend') {
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const daySpan = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
    const useMonthBuckets = range === 'year' || daySpan > 62;
    const useWeekBuckets = !useMonthBuckets && daySpan > 31;

    expenses.forEach((expense) => {
      if (range === 'day') {
        aggregate('Today', expense.amount);
      } else if (useMonthBuckets) {
        aggregate(expense.date.slice(0, 7), expense.amount);
      } else if (useWeekBuckets) {
        aggregate(getWeekStartKey(expense.date), expense.amount);
      } else {
        aggregate(expense.date, expense.amount);
      }
    });

    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({
        label: key === 'Today'
          ? key
          : useMonthBuckets
            ? formatMonthLabel(key)
            : useWeekBuckets
              ? `Wk ${displayDate(key).slice(0, 6)}`
              : displayDate(key),
        amount,
      }));
  }

  expenses.forEach((expense) => {
    const key = dimension === 'category'
      ? expense.category
      : dimension === 'subcategory'
        ? expense.subcategory
        : dimension === 'member'
          ? (memberNames?.get(expense.paidBy) || 'Family')
          : expense.title;
    aggregate(key, expense.amount);
  });

  const sorted = [...totals.entries()].sort(([, a], [, b]) => b - a);
  const limited = dimension === 'product' || dimension === 'subcategory' ? sorted.slice(0, 10) : sorted;
  return limited.map(([label, amount]) => ({ label, amount }));
}

function getWeekStartKey(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return dateString;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return toDateKey(date);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatWeekday(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
}

/** Groups filtered expenses into newest-first day buckets with totals and shares. */
export function groupExpensesByDay(
  expenses: Expense[],
  now = new Date()
): ReportDayGroup[] {
  const todayKey = todayString(now);
  const yesterdayKey = toDateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  );
  const grandTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  const byDate = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const existing = byDate.get(expense.date);
    if (existing) {
      existing.push(expense);
    } else {
      byDate.set(expense.date, [expense]);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayItems]) => {
      const sortedItems = [...dayItems].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.amount - a.amount
      );
      const total = sortedItems.reduce((sum, item) => sum + item.amount, 0);
      return {
        date,
        label: displayDate(date),
        weekday: formatWeekday(date),
        isToday: date === todayKey,
        isYesterday: date === yesterdayKey,
        total,
        count: sortedItems.length,
        percentOfTotal: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
        items: sortedItems,
      };
    });
}

/** Summarizes daywise spending metrics, peak day, and top contributors for a filtered report. */
export function buildReportMetrics(
  expenses: Expense[],
  dayGroups: ReportDayGroup[],
  memberNames?: Map<string, string>
): ReportMetrics {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const count = expenses.length;
  const activeDays = dayGroups.length;
  const averagePerDay = activeDays > 0 ? total / activeDays : 0;
  const averagePerEntry = count > 0 ? total / count : 0;

  let peakDay: ReportMetrics['peakDay'] = null;
  for (const group of dayGroups) {
    if (!peakDay || group.total > peakDay.total) {
      peakDay = { date: group.date, label: group.label, total: group.total };
    }
  }

  const categoryTotals = new Map<ExpenseCategory, number>();
  const memberTotals = new Map<string, number>();
  for (const expense of expenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) || 0) + expense.amount
    );
    const memberLabel = memberNames?.get(expense.paidBy) || 'Family';
    memberTotals.set(memberLabel, (memberTotals.get(memberLabel) || 0) + expense.amount);
  }

  const topCatEntry = [...categoryTotals.entries()].sort(([, a], [, b]) => b - a)[0];
  const topMemberEntry = [...memberTotals.entries()].sort(([, a], [, b]) => b - a)[0];

  return {
    total,
    count,
    activeDays,
    averagePerDay,
    averagePerEntry,
    peakDay,
    topCategory: topCatEntry
      ? {
          category: topCatEntry[0],
          total: topCatEntry[1],
          percent: total > 0 ? Math.round((topCatEntry[1] / total) * 100) : 0,
        }
      : null,
    topMember: topMemberEntry
      ? {
          name: topMemberEntry[0],
          total: topMemberEntry[1],
          percent: total > 0 ? Math.round((topMemberEntry[1] / total) * 100) : 0,
        }
      : null,
  };
}
