import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, displayDate, formatMoney, SUBCATEGORIES, todayString } from './models';
import type { CurrencyCode, Expense, ExpenseCategory, FamilyMember } from './models';
import { DatePickerField, Dropdown } from './controls';
import type { DropdownOption } from './controls';
import { buildChart, getBounds } from './reportUtils';
import type { ChartDimension, ReportRange } from './reportUtils';
import { useTheme, useThemedStyles } from './theme';
import type { ThemeColors } from './theme';
import { getCategoryIcon, getSubcategoryIcon } from './components/categoryIcons';

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
  { label: 'By member', value: 'member' },
  { label: 'By product', value: 'product' },
];
const ALL_OPTION: DropdownOption<string> = { label: 'All', value: ALL };

export function ReportsScreen({
  expenses,
  members,
  currency,
}: {
  expenses: Expense[];
  members: FamilyMember[];
  currency: CurrencyCode;
}) {
  const { categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [range, setRange] = useState<ReportRange>('month');
  const [customStart, setCustomStart] = useState(todayString());
  const [customEnd, setCustomEnd] = useState(todayString());
  const [category, setCategory] = useState<string>(ALL);
  const [subcategory, setSubcategory] = useState<string>(ALL);
  const [memberId, setMemberId] = useState<string>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [dimension, setDimension] = useState<ChartDimension>('trend');

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const bounds = useMemo(
    () => getBounds(range, customStart, customEnd),
    [range, customEnd, customStart]
  );

  const availableSubcategories = useMemo(() => {
    const base =
      category === ALL
        ? Object.values(SUBCATEGORIES).flat()
        : SUBCATEGORIES[category as ExpenseCategory];
    const fromExpenses = expenses
      .filter((expense) => category === ALL || expense.category === category)
      .map((expense) => expense.subcategory);
    return Array.from(new Set([...base, ...fromExpenses]));
  }, [category, expenses]);

  const inDateRange = useMemo(
    () => expenses.filter((expense) => expense.date >= bounds.start && expense.date <= bounds.end),
    [bounds.end, bounds.start, expenses]
  );

  const productOptions = useMemo(() => {
    const products = [...new Set(
      inDateRange
        .filter((expense) => category === ALL || expense.category === category)
        .filter((expense) => subcategory === ALL || expense.subcategory === subcategory)
        .filter((expense) => memberId === ALL || expense.paidBy === memberId)
        .map((expense) => expense.title)
    )].sort((a, b) => a.localeCompare(b));
    return [ALL_OPTION, ...products.map((value) => ({ label: value, value }))];
  }, [category, inDateRange, memberId, subcategory]);

  const filtered = useMemo(
    () => inDateRange
      .filter((expense) => category === ALL || expense.category === category)
      .filter((expense) => subcategory === ALL || expense.subcategory === subcategory)
      .filter((expense) => memberId === ALL || expense.paidBy === memberId)
      .filter((expense) => product === ALL || expense.title === product),
    [category, inDateRange, memberId, product, subcategory]
  );

  const total = useMemo(
    () => filtered.reduce((sum, expense) => sum + expense.amount, 0),
    [filtered]
  );

  const chartData = useMemo(
    () => buildChart(filtered, dimension, range, bounds.start, bounds.end, memberNames),
    [bounds.end, bounds.start, dimension, filtered, memberNames, range]
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
  const changeMember = (value: string) => {
    setMemberId(value);
    setProduct(ALL);
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>
        Explore spending by date, member, category, subcategory, and product.
      </Text>

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
          label="Paid by"
          value={memberId}
          options={[
            ALL_OPTION,
            ...members.map((member) => ({ label: member.name, value: member.id })),
          ]}
          onChange={changeMember}
        />
        <Dropdown
          label="Category"
          value={category}
          options={[
            ALL_OPTION,
            ...CATEGORIES.map((value) => ({
              label: value,
              value,
              icon: getCategoryIcon(value),
              iconColor: categoryColors[value]?.fg,
              iconBg: categoryColors[value]?.bg,
            })),
          ]}
          onChange={changeCategory}
        />
        <Dropdown
          label="Subcategory"
          value={subcategory}
          options={[
            ALL_OPTION,
            ...availableSubcategories.map((value) => ({
              label: value,
              value,
              icon: getSubcategoryIcon(value, category === ALL ? undefined : category),
              iconColor:
                category !== ALL ? categoryColors[category as ExpenseCategory]?.fg : undefined,
              iconBg:
                category !== ALL ? categoryColors[category as ExpenseCategory]?.bg : undefined,
            })),
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

      <Text style={styles.note}>
        Product reports use the expense description entered when the expense was added.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    title: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 18 },
    filterCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16 },
    cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
    dateRange: { flexDirection: 'row', gap: 10 },
    dateField: { flex: 1 },
    totalCard: { marginTop: 15, backgroundColor: colors.heroBg, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    totalLabel: { color: colors.primarySoftText, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
    totalAmount: { color: colors.onPrimary, fontSize: 25, fontWeight: '900', marginTop: 5 },
    countBadge: { backgroundColor: '#ffffff22', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, alignItems: 'center' },
    countValue: { color: colors.onPrimary, fontWeight: '900', fontSize: 17 },
    countLabel: { color: colors.primarySoftText, fontWeight: '700', fontSize: 9 },
    chartCard: { marginTop: 16, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16 },
    chart: { marginTop: 17, gap: 14 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 78, color: colors.ink, fontSize: 10, fontWeight: '700' },
    barTrack: { flex: 1, height: 12, borderRadius: 8, backgroundColor: colors.track, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 8, backgroundColor: colors.primaryMid },
    barAmount: { width: 74, textAlign: 'right', color: colors.muted, fontSize: 9, fontWeight: '700' },
    rangeCaption: { color: colors.muted, fontSize: 10, marginTop: 16 },
    empty: { paddingVertical: 28, alignItems: 'center' },
    emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 13, marginBottom: 5 },
    emptyText: { color: colors.muted, fontSize: 11 },
    note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 14 },
  });
