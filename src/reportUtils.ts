import { displayDate, formatMonthLabel, todayString } from './domain';
import type { Expense } from './domain';

export type ReportRange = 'day' | 'week' | 'month' | 'year' | 'custom';
export type ChartDimension = 'trend' | 'category' | 'subcategory' | 'product' | 'member';

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
