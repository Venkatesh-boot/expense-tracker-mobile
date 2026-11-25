import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, displayDate, formatMoney, SUBCATEGORIES, todayString } from './models';
import type { CurrencyCode, Expense, ExpenseCategory } from './models';
import { DatePickerField, Dropdown } from './controls';
import type { DropdownOption } from './controls';
import { COLORS } from './theme';

type ReportRange = 'day' | 'week' | 'month' | 'year' | 'custom';
type ChartDimension = 'trend' | 'category' | 'subcategory' | 'product';

const ALL = '__all__';
const RANGE_OPTIONS: DropdownOption<ReportRange>[] = [
  { label: 'Today', value: 'day' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'Custom dates', value: 'custom' },
];
const CHART_OPTIONS: DropdownOption<ChartDimension>[] = [
  { label: 'Spending trend', value: 'trend' },
  { label: 'By category', value: 'category' },
  { label: 'By subcategory', value: 'subcategory' },
  { label: 'By product', value: 'product' },
];
const ALL_OPTION: DropdownOption<string> = { label: 'All', value: ALL };

export function ReportsScreen({
  expenses,
  currency,
}: {
  expenses: Expense[];
  currency: CurrencyCode;
}) {
  const [range, setRange] = useState<ReportRange>('month');
  const [customStart, setCustomStart] = useState(todayString());
  const [customEnd, setCustomEnd] = useState(todayString());
  const [category, setCategory] = useState<string>(ALL);
  const [subcategory, setSubcategory] = useState<string>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [dimension, setDimension] = useState<ChartDimension>('trend');
  const bounds = useMemo(
    () => getBounds(range, customStart, customEnd),
    [range, customEnd, customStart]
  );
  const availableSubcategories = category === ALL
    ? Array.from(new Set(Object.values(SUBCATEGORIES).flat()))
    : SUBCATEGORIES[category as ExpenseCategory];

  const inDateRange = useMemo(
    () => expenses.filter((expense) => expense.date >= bounds.start && expense.date <= bounds.end),
    [bounds.end, bounds.start, expenses]
  );
  const productOptions = useMemo(() => {
    const products = [...new Set(
      inDateRange
        .filter((expense) => category === ALL || expense.category === category)
        .filter((expense) => subcategory === ALL || expense.subcategory === subcategory)
        .map((expense) => expense.title)
    )].sort((a, b) => a.localeCompare(b));
    return [ALL_OPTION, ...products.map((value) => ({ label: value, value }))];
  }, [category, inDateRange, subcategory]);
  const filtered = useMemo(
    () => inDateRange
      .filter((expense) => category === ALL || expense.category === category)
      .filter((expense) => subcategory === ALL || expense.subcategory === subcategory)
      .filter((expense) => product === ALL || expense.title === product),
    [category, inDateRange, product, subcategory]
  );
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const chartData = useMemo(
    () => buildChart(filtered, dimension, range, bounds.start, bounds.end),
    [bounds.end, bounds.start, dimension, filtered, range]
  );
  const chartMax = Math.max(1, ...chartData.map((item) => item.amount));

  const changeCategory = (value: string) => {
    setCategory(value);
    setSubcategory(ALL);
    setProduct(ALL);
  };
  const changeSubcategory = (value: string) => {
    setSubcategory(value);
    setProduct(ALL);
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>Explore spending by date, category, subcategory, and product.</Text>

      <View style={styles.filterCard}>
        <Text style={styles.cardTitle}>Filter your report</Text>
        <Dropdown
          label="Time period"
          value={range}
          options={RANGE_OPTIONS}
          onChange={setRange}
        />
        {range === 'custom' ? (
          <View style={styles.dateRange}>
            <View style={styles.dateField}>
              <DatePickerField label="From" value={customStart} onChange={setCustomStart} />
            </View>
            <View style={styles.dateField}>
              <DatePickerField label="To" value={customEnd} onChange={setCustomEnd} />
            </View>
          </View>
        ) : null}
        <Dropdown
          label="Category"
          value={category}
          options={[
            ALL_OPTION,
            ...CATEGORIES.map((value) => ({ label: value, value })),
          ]}
          onChange={changeCategory}
        />
        <Dropdown
          label="Subcategory"
          value={subcategory}
          options={[
            ALL_OPTION,
            ...availableSubcategories.map((value) => ({ label: value, value })),
          ]}
          onChange={changeSubcategory}
        />
        <Dropdown
          label="Product / description"
          value={product}
          options={productOptions}
          onChange={setProduct}
        />
      </View>

      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>TOTAL SPENDING</Text>
          <Text style={styles.totalAmount}>{formatMoney(total, currency)}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{filtered.length}</Text>
          <Text style={styles.countLabel}>entries</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Spending graph</Text>
        <Dropdown
          label="Graph"
          value={dimension}
          options={CHART_OPTIONS}
          onChange={setDimension}
        />
        {chartData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No expenses in this selection</Text>
            <Text style={styles.emptyText}>Try another date range or remove a filter.</Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {chartData.map((item) => (
              <View key={item.label} style={styles.barRow}>
                <Text numberOfLines={1} style={styles.barLabel}>{item.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(3, (item.amount / chartMax) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barAmount}>{formatMoney(item.amount, currency)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.rangeCaption}>
          {displayDate(bounds.start)} — {displayDate(bounds.end)}
        </Text>
      </View>

      <Text style={styles.note}>Product reports use the expense description entered when the expense was added.</Text>
    </ScrollView>
  );
}

function getBounds(
  range: ReportRange,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  const today = new Date();
  const end = todayString();
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

function buildChart(
  expenses: Expense[],
  dimension: ChartDimension,
  range: ReportRange,
  start: string,
  end: string
): { label: string; amount: number }[] {
  const totals = new Map<string, number>();
  const aggregate = (key: string, amount: number) => {
    totals.set(key, (totals.get(key) || 0) + amount);
  };

  if (dimension === 'trend') {
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const daySpan = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
    const useMonthBuckets = range === 'year' || daySpan > 45;
    expenses.forEach((expense) => {
      if (range === 'day') {
        aggregate('Today', expense.amount);
      } else {
        const key = useMonthBuckets ? expense.date.slice(0, 7) : expense.date;
        aggregate(key, expense.amount);
      }
    });
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({
        label: key === 'Today'
          ? key
          : useMonthBuckets
            ? formatMonth(key)
            : displayDate(key),
        amount,
      }))
      .slice(-12);
  }

  expenses.forEach((expense) => {
    const key = dimension === 'category'
      ? expense.category
      : dimension === 'subcategory'
        ? expense.subcategory
        : expense.title;
    aggregate(key, expense.amount);
  });
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, amount]) => ({ label, amount }));
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  });
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: COLORS.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  filterCard: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  cardTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 15 },
  dateRange: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1 },
  totalCard: { marginTop: 15, backgroundColor: COLORS.primary, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: '#D5EAE1', fontWeight: '700', fontSize: 10, letterSpacing: 1 },
  totalAmount: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 5 },
  countBadge: { backgroundColor: '#ffffff22', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, alignItems: 'center' },
  countValue: { color: COLORS.white, fontWeight: '900', fontSize: 17 },
  countLabel: { color: '#D5EAE1', fontWeight: '700', fontSize: 9 },
  chartCard: { marginTop: 16, backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  chart: { marginTop: 17, gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 78, color: COLORS.ink, fontSize: 10, fontWeight: '700' },
  barTrack: { flex: 1, height: 12, borderRadius: 8, backgroundColor: '#EEF2F5', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, backgroundColor: '#58A78C' },
  barAmount: { width: 74, textAlign: 'right', color: COLORS.muted, fontSize: 9, fontWeight: '700' },
  rangeCaption: { color: COLORS.muted, fontSize: 10, marginTop: 16 },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 13, marginBottom: 5 },
  emptyText: { color: COLORS.muted, fontSize: 11 },
  note: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 14 },
});
