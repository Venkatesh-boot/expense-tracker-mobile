import type { Expense, ExpenseCategory } from './domain';

export type PricePoint = {
  id: string;
  date: string;
  createdAt: string;
  unitPrice: number;
  totalAmount: number;
  quantity: number;
  unit: string;
  normalizedQuantity: number;
  normalizedUnit: string;
  paidBy: string;
  deltaFromPrev: number;
  deltaPercentFromPrev: number | null;
};

export type ProductPriceHistory = {
  key: string;
  title: string;
  category: ExpenseCategory;
  subcategory: string;
  unit: string;
  entryCount: number;
  points: PricePoint[];
  firstPrice: number;
  latestPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  changeAmount: number;
  changePercent: number;
  latestChangeAmount: number;
  latestChangePercent: number | null;
  firstDate: string;
  latestDate: string;
};

/** Groups expenses by product name and computes chronological unit-price history. */
export function buildProductPriceHistories(expenses: Expense[]): ProductPriceHistory[] {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const trimmed = expense.title.trim();
    if (!trimmed || expense.quantity <= 0 || expense.amount <= 0) continue;
    const key = trimmed.toLowerCase();
    const list = groups.get(key);
    if (list) {
      list.push(expense);
    } else {
      groups.set(key, [expense]);
    }
  }

  const histories: ProductPriceHistory[] = [];

  for (const [key, items] of groups.entries()) {
    const sorted = [...items].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
    const latestExpense = sorted[sorted.length - 1];
    const unitSet = new Set(sorted.map((item) => item.unit.trim()));
    const useKg = unitSet.has('kg') && unitSet.has('g');
    const useLiter = unitSet.has('L') && unitSet.has('mL');

    const normalizeMeasure = (item: Expense): { qty: number; unit: string } => {
      const rawUnit = item.unit.trim();
      if (useKg && rawUnit === 'g') {
        return { qty: item.quantity / 1000, unit: 'kg' };
      }
      if (useLiter && rawUnit === 'mL') {
        return { qty: item.quantity / 1000, unit: 'L' };
      }
      return { qty: item.quantity, unit: rawUnit };
    };

    const primaryUnit = normalizeMeasure(latestExpense).unit;
    const comparable = sorted.filter((item) => normalizeMeasure(item).unit === primaryUnit);
    const source = comparable.length > 0 ? comparable : sorted;

    const points: PricePoint[] = [];
    for (const item of source) {
      const measure = normalizeMeasure(item);
      if (measure.qty <= 0) continue;
      const unitPrice = item.amount / measure.qty;
      const prev = points[points.length - 1];
      const deltaFromPrev = prev ? unitPrice - prev.unitPrice : 0;
      const deltaPercentFromPrev =
        prev && prev.unitPrice > 0
          ? Math.round(((unitPrice - prev.unitPrice) / prev.unitPrice) * 1000) / 10
          : null;

      points.push({
        id: item.id,
        date: item.date,
        createdAt: item.createdAt,
        unitPrice,
        totalAmount: item.amount,
        quantity: item.quantity,
        unit: item.unit,
        normalizedQuantity: measure.qty,
        normalizedUnit: measure.unit,
        paidBy: item.paidBy,
        deltaFromPrev,
        deltaPercentFromPrev,
      });
    }

    if (points.length === 0) continue;

    const prices = points.map((point) => point.unitPrice);
    const firstPrice = prices[0];
    const latestPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    const changeAmount = latestPrice - firstPrice;
    const changePercent =
      firstPrice > 0 ? Math.round(((latestPrice - firstPrice) / firstPrice) * 1000) / 10 : 0;
    const latestPoint = points[points.length - 1];

    histories.push({
      key,
      title: latestExpense.title.trim(),
      category: latestExpense.category,
      subcategory: latestExpense.subcategory,
      unit: primaryUnit,
      entryCount: sorted.length,
      points,
      firstPrice,
      latestPrice,
      minPrice,
      maxPrice,
      avgPrice,
      changeAmount,
      changePercent,
      latestChangeAmount: latestPoint.deltaFromPrev,
      latestChangePercent: latestPoint.deltaPercentFromPrev,
      firstDate: points[0].date,
      latestDate: latestPoint.date,
    });
  }

  return histories.sort((a, b) => {
    const aMulti = a.points.length >= 2 ? 1 : 0;
    const bMulti = b.points.length >= 2 ? 1 : 0;
    if (bMulti !== aMulti) return bMulti - aMulti;
    if (aMulti && Math.abs(b.changePercent) !== Math.abs(a.changePercent)) {
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    }
    return b.latestDate.localeCompare(a.latestDate);
  });
}
