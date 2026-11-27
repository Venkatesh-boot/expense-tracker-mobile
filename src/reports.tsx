import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, CURRENCY_SYMBOLS, displayDate, formatMoney, SUBCATEGORIES, todayString } from './models';
import type { CurrencyCode, Expense, ExpenseCategory, FamilyMember } from './models';
import { DatePickerField, Dropdown } from './controls';
import type { DropdownOption } from './controls';
import {
  buildChart,
  buildMonthComparison,
  buildReportMetrics,
  buildYearComparison,
  getBounds,
  groupExpensesByDay,
} from './reportUtils';
import type { ChartDimension, MonthCompareItem, ReportRange, YearCompareItem } from './reportUtils';
import { useTheme, useThemedStyles } from './theme';
import type { ThemeColors } from './theme';
import { getCategoryIcon, getSubcategoryIcon } from './components/categoryIcons';
import { ExpenseRow } from './components/ExpenseRow';
import { SectionHeading } from './components/SectionHeading';

const ALL = '__all__';
const RANGE_CHIPS: { label: string; value: ReportRange }[] = [
  { label: 'Today', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];
const CHART_TABS: { label: string; value: ChartDimension }[] = [
  { label: 'Daily trend', value: 'trend' },
  { label: 'Category', value: 'category' },
  { label: 'Subcategory', value: 'subcategory' },
  { label: 'Member', value: 'member' },
  { label: 'Product', value: 'product' },
  { label: 'Monthly', value: 'month-compare' },
  { label: 'Yearly', value: 'year-compare' },
];
const ALL_OPTION: DropdownOption<string> = { label: 'All', value: ALL };

export function ReportsScreen({
  expenses,
  members,
  currency,
  onSelectExpense,
  onDeleteExpense,
}: {
  expenses: Expense[];
  members: FamilyMember[];
  currency: CurrencyCode;
  onSelectExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expense: Expense) => void;
}) {
  const { categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [range, setRange] = useState<ReportRange>('month');
  const [customStart, setCustomStart] = useState(todayString());
  const [customEnd, setCustomEnd] = useState(todayString());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<string>(ALL);
  const [subcategory, setSubcategory] = useState<string>(ALL);
  const [memberId, setMemberId] = useState<string>(ALL);
  const [product, setProduct] = useState<string>(ALL);
  const [dimension, setDimension] = useState<ChartDimension>('trend');
  const [dayExpandOverrides, setDayExpandOverrides] = useState<Record<string, boolean>>({});
  const [expandAllMode, setExpandAllMode] = useState<boolean | null>(null);

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

  const dayGroups = useMemo(() => groupExpensesByDay(filtered), [filtered]);
  const metrics = useMemo(
    () => buildReportMetrics(filtered, dayGroups, memberNames),
    [dayGroups, filtered, memberNames]
  );

  const chartData = useMemo(
    () => buildChart(filtered, dimension, range, bounds.start, bounds.end, memberNames),
    [bounds.end, bounds.start, dimension, filtered, memberNames, range]
  );
  const chartMax = Math.max(1, ...chartData.map((item) => item.amount));
  const peakDayTotal = Math.max(1, metrics.peakDay?.total ?? 1);

  const monthComparison = useMemo(
    () => (dimension === 'month-compare' ? buildMonthComparison(expenses) : []),
    [dimension, expenses]
  );
  const yearComparison = useMemo(
    () => (dimension === 'year-compare' ? buildYearComparison(expenses) : []),
    [dimension, expenses]
  );

  const activeFilterCount =
    (category !== ALL ? 1 : 0) +
    (subcategory !== ALL ? 1 : 0) +
    (memberId !== ALL ? 1 : 0) +
    (product !== ALL ? 1 : 0);

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
  const clearFilters = () => {
    setCategory(ALL);
    setSubcategory(ALL);
    setMemberId(ALL);
    setProduct(ALL);
  };

  const isDayExpanded = (date: string, index: number): boolean => {
    if (date in dayExpandOverrides) return dayExpandOverrides[date];
    if (expandAllMode !== null) return expandAllMode;
    return index < 3;
  };

  const toggleDay = (date: string, index: number) => {
    const currentlyExpanded = isDayExpanded(date, index);
    setDayExpandOverrides((prev) => ({ ...prev, [date]: !currentlyExpanded }));
  };

  const allExpanded =
    dayGroups.length > 0 && dayGroups.every((group, idx) => isDayExpanded(group.date, idx));

  const toggleExpandAll = () => {
    setExpandAllMode(!allExpanded);
    setDayExpandOverrides({});
  };

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>
        Daywise expense ledger, spending breakdown, and category analytics.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rangeChipsRow}
      >
        {RANGE_CHIPS.map((chip) => {
          const active = range === chip.value;
          return (
            <Pressable
              key={chip.value}
              style={[styles.rangeChip, active && styles.rangeChipActive]}
              onPress={() => setRange(chip.value)}
            >
              <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {range === 'custom' ? (
        <View style={styles.customRangeCard}>
          <View style={styles.dateRange}>
            <View style={styles.dateField}>
              <DatePickerField label="From" value={customStart} onChange={setCustomStart} />
            </View>
            <View style={styles.dateField}>
              <DatePickerField label="To" value={customEnd} onChange={setCustomEnd} />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.filterHeaderRow}>
        <Pressable
          style={[styles.filterToggleButton, (filtersOpen || activeFilterCount > 0) && styles.filterToggleActive]}
          onPress={() => setFiltersOpen((open) => !open)}
        >
          <Text
            style={[
              styles.filterToggleText,
              (filtersOpen || activeFilterCount > 0) && styles.filterToggleTextActive,
            ]}
          >
            {filtersOpen ? 'Hide filters' : 'Filters'}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
        {activeFilterCount > 0 ? (
          <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      {filtersOpen ? (
        <View style={styles.filterCard}>
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
      ) : null}

      <View style={styles.totalCard}>
        <View style={styles.flex}>
          <Text style={styles.totalLabel}>TOTAL SPENDING</Text>
          <Text style={styles.totalAmount}>{formatMoney(metrics.total, currency)}</Text>
          <Text style={styles.totalRange}>
            {displayDate(bounds.start)} — {displayDate(bounds.end)}
            {metrics.activeDays > 0 ? ` · ${metrics.activeDays} active ${metrics.activeDays === 1 ? 'day' : 'days'}` : ''}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{metrics.count}</Text>
          <Text style={styles.countLabel}>{metrics.count === 1 ? 'entry' : 'entries'}</Text>
        </View>
      </View>

      {metrics.count > 0 ? (
        <View style={styles.kpiStrip}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiTileLabel}>Avg / active day</Text>
            <Text style={styles.kpiTileValue} numberOfLines={1}>
              {formatMoney(metrics.averagePerDay, currency)}
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiTileLabel}>Highest day</Text>
            <Text style={styles.kpiTileValue} numberOfLines={1}>
              {metrics.peakDay ? formatMoney(metrics.peakDay.total, currency) : '—'}
            </Text>
            {metrics.peakDay ? (
              <Text style={styles.kpiTileSub} numberOfLines={1}>
                {metrics.peakDay.label}
              </Text>
            ) : null}
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiTileLabel}>Top category</Text>
            <Text style={styles.kpiTileValue} numberOfLines={1}>
              {metrics.topCategory ? metrics.topCategory.category : '—'}
            </Text>
            {metrics.topCategory ? (
              <Text style={styles.kpiTileSub} numberOfLines={1}>
                {metrics.topCategory.percent}% · {formatMoney(metrics.topCategory.total, currency)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <SectionHeading
        title="Daywise expenses"
        action={dayGroups.length > 1 ? (allExpanded ? 'Collapse all' : 'Expand all') : undefined}
        onAction={dayGroups.length > 1 ? toggleExpandAll : undefined}
      />

      {dayGroups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No expenses in this period</Text>
          <Text style={styles.emptyText}>Try choosing another period or clearing active filters.</Text>
        </View>
      ) : (
        <View style={styles.dayGroupsList}>
          {dayGroups.map((group, idx) => {
            const expanded = isDayExpanded(group.date, idx);
            const dayLabelPrefix = group.isToday
              ? 'Today · '
              : group.isYesterday
                ? 'Yesterday · '
                : '';
            return (
              <View key={group.date} style={styles.dayCard}>
                <Pressable
                  style={styles.dayHeader}
                  onPress={() => toggleDay(group.date, idx)}
                  accessibilityRole="button"
                >
                  <View style={styles.dayHeaderTop}>
                    <View style={styles.flex}>
                      <View style={styles.dayTitleRow}>
                        <Text style={styles.dayTitle}>
                          {dayLabelPrefix}
                          {group.weekday ? `${group.weekday}, ` : ''}
                          {group.label}
                        </Text>
                        <View style={styles.dayCountBadge}>
                          <Text style={styles.dayCountText}>
                            {group.count} {group.count === 1 ? 'item' : 'items'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.dayAmountBlock}>
                      <Text style={styles.dayAmount}>{formatMoney(group.total, currency)}</Text>
                      <Text style={styles.dayPercent}>
                        {group.percentOfTotal}% · {expanded ? 'Hide' : 'Show'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dayBarTrack}>
                    <View
                      style={[
                        styles.dayBarFill,
                        { width: `${Math.max(4, (group.total / peakDayTotal) * 100)}%` },
                      ]}
                    />
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.dayItemsWrap}>
                    {group.items.map((item, itemIdx) => (
                      <ExpenseRow
                        key={item.id}
                        expense={item}
                        memberName={memberNames.get(item.paidBy) || 'Family'}
                        currency={currency}
                        onPress={onSelectExpense}
                        onDelete={onDeleteExpense}
                        hideDate
                        last={itemIdx === group.items.length - 1}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <SectionHeading title="Breakdown chart" />
      <View style={styles.chartCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartTabsRow}
        >
          {CHART_TABS.map((tab) => {
            const active = dimension === tab.value;
            return (
              <Pressable
                key={tab.value}
                style={[styles.chartTab, active && styles.chartTabActive]}
                onPress={() => setDimension(tab.value)}
              >
                <Text style={[styles.chartTabText, active && styles.chartTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {dimension === 'month-compare' ? (
          <MonthCompareSection items={monthComparison} currency={currency} />
        ) : dimension === 'year-compare' ? (
          <YearCompareSection items={yearComparison} currency={currency} />
        ) : chartData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chart data in this selection</Text>
            <Text style={styles.emptyText}>Adjust your date range or filters to plot spending.</Text>
          </View>
        ) : (
          <View style={styles.chart}>
            {chartData.map((item) => {
              const share = metrics.total > 0 ? Math.round((item.amount / metrics.total) * 100) : 0;
              return (
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
                  <Text style={styles.barAmount}>
                    {formatMoney(item.amount, currency)}
                    {dimension !== 'trend' && metrics.total > 0 ? ` (${share}%)` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Month Comparison Sub-Component ─────────────────────────────────────────

function formatShortMoney(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (amount >= 100_000) return `${symbol}${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}k`;
  return `${symbol}${Math.round(amount)}`;
}

function MonthCompareSection({
  items,
  currency,
}: {
  items: MonthCompareItem[];
  currency: CurrencyCode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedIndex, setSelectedIndex] = useState<number>(Math.max(0, items.length - 1));

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No monthly data yet</Text>
        <Text style={styles.emptyText}>Add expenses to see month-over-month comparison.</Text>
      </View>
    );
  }

  const maxTotal = Math.max(1, ...items.map((m) => m.total));
  const selected = items[Math.min(selectedIndex, items.length - 1)];
  const isSelectedUp = selected.deltaVsPrev !== null && selected.deltaVsPrev > 0;
  const isSelectedDown = selected.deltaVsPrev !== null && selected.deltaVsPrev < 0;

  return (
    <View style={styles.vChartWrap}>
      <View style={styles.vCompareBanner}>
        <View style={styles.flex}>
          <Text style={styles.vCompareBannerTitle}>
            {selected.label}
            {selected.isCurrent ? ' (Current)' : ''}
          </Text>
          <Text style={styles.vCompareBannerSub}>
            {formatMoney(selected.total, currency)} · {selected.count}{' '}
            {selected.count === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
        {selected.deltaPercent !== null ? (
          <View
            style={[
              styles.vDeltaPill,
              isSelectedUp && { backgroundColor: colors.dangerLight },
              isSelectedDown && { backgroundColor: colors.successLight },
            ]}
          >
            <Text
              style={[
                styles.vDeltaPillText,
                isSelectedUp && { color: colors.danger },
                isSelectedDown && { color: colors.success },
              ]}
            >
              {isSelectedUp ? '▲' : isSelectedDown ? '▼' : '—'} {Math.abs(selected.deltaPercent)}% vs prev
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.vBarsRow}
      >
        {items.map((item, idx) => {
          const isSelected = idx === Math.min(selectedIndex, items.length - 1);
          const barHeight = item.total > 0 ? Math.max(10, (item.total / maxTotal) * 118) : 4;
          const isUp = item.deltaVsPrev !== null && item.deltaVsPrev > 0;
          const isDown = item.deltaVsPrev !== null && item.deltaVsPrev < 0;

          return (
            <Pressable
              key={item.monthKey}
              style={[styles.vBarCol, isSelected && styles.vBarColSelected]}
              onPress={() => setSelectedIndex(idx)}
            >
              <Text style={styles.vBarValue} numberOfLines={1}>
                {item.total > 0 ? formatShortMoney(item.total, currency) : '0'}
              </Text>
              <View style={styles.vBarTrack}>
                <View
                  style={[
                    styles.vBarFill,
                    {
                      height: barHeight,
                      backgroundColor: isSelected
                        ? colors.primary
                        : item.isCurrent
                          ? colors.primaryMid
                          : item.total > 0
                            ? `${colors.primaryMid}99`
                            : colors.track,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.vBarLabel,
                  (item.isCurrent || isSelected) && styles.vBarLabelActive,
                ]}
                numberOfLines={1}
              >
                {item.shortLabel}
              </Text>
              <Text
                style={[
                  styles.vBarDelta,
                  isUp && { color: colors.danger },
                  isDown && { color: colors.success },
                ]}
                numberOfLines={1}
              >
                {item.deltaPercent !== null
                  ? `${isUp ? '▲' : isDown ? '▼' : ''}${Math.abs(item.deltaPercent)}%`
                  : ' '}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.vChartHint}>Tap any month bar to inspect details · Scroll for 12 months</Text>
    </View>
  );
}

// ─── Year Comparison Sub-Component ──────────────────────────────────────────

function YearCompareSection({
  items,
  currency,
}: {
  items: YearCompareItem[];
  currency: CurrencyCode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedYear, setSelectedYear] = useState<number | null>(
    items.length > 0 ? items[items.length - 1].year : null
  );

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No yearly data yet</Text>
        <Text style={styles.emptyText}>Add expenses to see year-over-year comparison.</Text>
      </View>
    );
  }

  const maxTotal = Math.max(1, ...items.map((y) => y.total));
  const activeItem = items.find((y) => y.year === selectedYear) ?? items[items.length - 1];
  const activeMonthMax = Math.max(1, ...activeItem.months.map((m) => m.total));
  const isUp = activeItem.deltaVsPrev !== null && activeItem.deltaVsPrev > 0;
  const isDown = activeItem.deltaVsPrev !== null && activeItem.deltaVsPrev < 0;

  return (
    <View style={styles.vChartWrap}>
      <View style={styles.vCompareBanner}>
        <View style={styles.flex}>
          <Text style={styles.vCompareBannerTitle}>
            Year {activeItem.year}
            {activeItem.isCurrent ? ' (Current)' : ''}
          </Text>
          <Text style={styles.vCompareBannerSub}>
            {formatMoney(activeItem.total, currency)} · avg {formatMoney(activeItem.monthlyAverage, currency)}/mo
          </Text>
        </View>
        {activeItem.deltaPercent !== null ? (
          <View
            style={[
              styles.vDeltaPill,
              isUp && { backgroundColor: colors.dangerLight },
              isDown && { backgroundColor: colors.successLight },
            ]}
          >
            <Text
              style={[
                styles.vDeltaPillText,
                isUp && { color: colors.danger },
                isDown && { color: colors.success },
              ]}
            >
              {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(activeItem.deltaPercent)}% YoY
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.vYearBarsRow}>
        {items.map((item) => {
          const isSelected = item.year === activeItem.year;
          const barHeight = item.total > 0 ? Math.max(12, (item.total / maxTotal) * 124) : 4;
          const yearUp = item.deltaVsPrev !== null && item.deltaVsPrev > 0;
          const yearDown = item.deltaVsPrev !== null && item.deltaVsPrev < 0;

          return (
            <Pressable
              key={item.year}
              style={[styles.vYearCol, isSelected && styles.vBarColSelected]}
              onPress={() => setSelectedYear(item.year)}
            >
              <Text style={styles.vBarValue} numberOfLines={1}>
                {formatShortMoney(item.total, currency)}
              </Text>
              <View style={styles.vBarTrack}>
                <View
                  style={[
                    styles.vYearBarFill,
                    {
                      height: barHeight,
                      backgroundColor: isSelected
                        ? colors.primary
                        : item.isCurrent
                          ? colors.secondary
                          : `${colors.secondary}99`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.vBarLabel,
                  (item.isCurrent || isSelected) && styles.vBarLabelActive,
                ]}
              >
                {item.year}
              </Text>
              <Text
                style={[
                  styles.vBarDelta,
                  yearUp && { color: colors.danger },
                  yearDown && { color: colors.success },
                ]}
              >
                {item.deltaPercent !== null
                  ? `${yearUp ? '▲' : yearDown ? '▼' : ''}${Math.abs(item.deltaPercent)}%`
                  : `${item.count} entries`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.vYearSubWrap}>
        <Text style={styles.vYearSubTitle}>{activeItem.year} month-by-month breakdown</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vSubBarsRow}
        >
          {activeItem.months.map((month) => {
            const mh = month.total > 0 ? Math.max(6, (month.total / activeMonthMax) * 68) : 3;
            return (
              <View key={month.monthKey} style={styles.vSubBarCol}>
                <Text style={styles.vSubBarValue} numberOfLines={1}>
                  {month.total > 0 ? formatShortMoney(month.total, currency) : '—'}
                </Text>
                <View style={styles.vSubBarTrack}>
                  <View
                    style={[
                      styles.vSubBarFill,
                      {
                        height: mh,
                        backgroundColor: month.total > 0 ? colors.primaryMid : colors.track,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.vSubBarLabel}>{month.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    title: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },

    rangeChipsRow: { gap: 8, paddingBottom: 4 },
    rangeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rangeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    rangeChipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    rangeChipTextActive: { color: colors.onPrimary, fontWeight: '800' },

    customRangeCard: {
      marginTop: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    dateRange: { flexDirection: 'row', gap: 10 },
    dateField: { flex: 1 },

    filterHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    filterToggleButton: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 11,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterToggleActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryBorder,
    },
    filterToggleText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    filterToggleTextActive: { color: colors.primary, fontWeight: '800' },
    clearFiltersButton: { paddingVertical: 6, paddingHorizontal: 8 },
    clearFiltersText: { color: colors.danger, fontSize: 12, fontWeight: '700' },

    filterCard: {
      marginTop: 10,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    totalCard: {
      marginTop: 14,
      backgroundColor: colors.heroBg,
      borderRadius: 20,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    totalLabel: { color: colors.primarySoftText, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
    totalAmount: { color: colors.onPrimary, fontSize: 27, fontWeight: '900', marginTop: 4 },
    totalRange: { color: colors.primarySoftText, fontSize: 11, marginTop: 5, fontWeight: '600' },
    countBadge: { backgroundColor: '#ffffff22', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, alignItems: 'center' },
    countValue: { color: colors.onPrimary, fontWeight: '900', fontSize: 18 },
    countLabel: { color: colors.primarySoftText, fontWeight: '700', fontSize: 10 },

    kpiStrip: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    kpiTile: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
    },
    kpiTileLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    kpiTileValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 },
    kpiTileSub: { color: colors.muted, fontSize: 10, marginTop: 2 },

    dayGroupsList: { gap: 10 },
    dayCard: {
      backgroundColor: colors.surface,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    dayHeader: {
      padding: 14,
      gap: 9,
    },
    dayHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    dayTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
    },
    dayTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    dayCountBadge: {
      backgroundColor: colors.surfaceTint,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    dayCountText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    dayAmountBlock: { alignItems: 'flex-end' },
    dayAmount: { color: colors.ink, fontSize: 15, fontWeight: '900' },
    dayPercent: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
    dayBarTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.track,
      overflow: 'hidden',
    },
    dayBarFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.primaryMid,
    },
    dayItemsWrap: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 14,
    },

    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    chartTabsRow: { gap: 8, paddingBottom: 4 },
    chartTab: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.surfaceTint,
    },
    chartTabActive: {
      backgroundColor: colors.primary,
    },
    chartTabText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    chartTabTextActive: { color: colors.onPrimary, fontWeight: '800' },

    chart: { marginTop: 15, gap: 13 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 80, color: colors.ink, fontSize: 11, fontWeight: '700' },
    barTrack: { flex: 1, height: 11, borderRadius: 7, backgroundColor: colors.track, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 7, backgroundColor: colors.primaryMid },
    barAmount: { width: 92, textAlign: 'right', color: colors.muted, fontSize: 10, fontWeight: '700' },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
    },
    empty: { paddingVertical: 24, alignItems: 'center' },
    emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 13, marginBottom: 5 },
    emptyText: { color: colors.muted, fontSize: 11, textAlign: 'center' },

    vChartWrap: { marginTop: 14, gap: 12 },
    vCompareBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceTint,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    vCompareBannerTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
    vCompareBannerSub: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    vDeltaPill: {
      backgroundColor: colors.surface,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    vDeltaPillText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
    vBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    vBarCol: {
      width: 52,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 12,
      gap: 5,
    },
    vBarColSelected: {
      backgroundColor: colors.primaryLight,
    },
    vBarValue: { color: colors.muted, fontSize: 9, fontWeight: '700' },
    vBarTrack: {
      height: 124,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    vBarFill: {
      width: 24,
      borderRadius: 7,
    },
    vBarLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    vBarLabelActive: { color: colors.primary, fontWeight: '800' },
    vBarDelta: { color: colors.muted, fontSize: 9, fontWeight: '800' },
    vChartHint: { color: colors.muted, fontSize: 10, textAlign: 'center' },

    vYearBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      gap: 10,
      paddingTop: 6,
    },
    vYearCol: {
      flex: 1,
      maxWidth: 96,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 14,
      gap: 5,
    },
    vYearBarFill: {
      width: 34,
      borderRadius: 9,
    },
    vYearSubWrap: {
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    vYearSubTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
    vSubBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      paddingBottom: 2,
    },
    vSubBarCol: {
      width: 40,
      alignItems: 'center',
      gap: 4,
    },
    vSubBarValue: { color: colors.muted, fontSize: 8, fontWeight: '700' },
    vSubBarTrack: {
      height: 70,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    vSubBarFill: {
      width: 16,
      borderRadius: 5,
    },
    vSubBarLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },

    vChartWrap: { marginTop: 14, gap: 12 },
    vCompareBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceTint,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    vCompareBannerTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
    vCompareBannerSub: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    vDeltaPill: {
      backgroundColor: colors.surface,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    vDeltaPillText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
    vBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    vBarCol: {
      width: 52,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 12,
      gap: 5,
    },
    vBarColSelected: {
      backgroundColor: colors.primaryLight,
    },
    vBarValue: { color: colors.muted, fontSize: 9, fontWeight: '700' },
    vBarTrack: {
      height: 124,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    vBarFill: {
      width: 24,
      borderRadius: 7,
    },
    vBarLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    vBarLabelActive: { color: colors.primary, fontWeight: '800' },
    vBarDelta: { color: colors.muted, fontSize: 9, fontWeight: '800' },
    vChartHint: { color: colors.muted, fontSize: 10, textAlign: 'center' },

    vYearBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      gap: 10,
      paddingTop: 6,
    },
    vYearCol: {
      flex: 1,
      maxWidth: 96,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 14,
      gap: 5,
    },
    vYearBarFill: {
      width: 34,
      borderRadius: 9,
    },
    vYearSubWrap: {
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    vYearSubTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
    vSubBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      paddingBottom: 2,
    },
    vSubBarCol: {
      width: 40,
      alignItems: 'center',
      gap: 4,
    },
    vSubBarValue: { color: colors.muted, fontSize: 8, fontWeight: '700' },
    vSubBarTrack: {
      height: 70,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    vSubBarFill: {
      width: 16,
      borderRadius: 5,
    },
    vSubBarLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  });
