import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CurrencyCode, Expense, FamilyMember } from '../models';
import { CURRENCY_SYMBOLS, displayDate, formatMoney } from '../models';
import { buildProductPriceHistories } from '../priceUtils';
import type { ProductPriceHistory } from '../priceUtils';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from '../components/AppIcon';
import { TrendLineChart } from '../components/Charts';
import type { LineChartPoint } from '../components/Charts';
import { ChoiceChip } from '../components/ChoiceChip';
import { SectionHeading } from '../components/SectionHeading';
import { getCategoryIcon } from '../components/categoryIcons';

type PriceFilter = 'all' | 'up' | 'down' | 'multi';

type PriceTrendsScreenProps = {
  expenses: Expense[];
  members: FamilyMember[];
  currency: CurrencyCode;
  initialProductTitle?: string | null;
  onSelectExpense: (expense: Expense) => void;
};

export function PriceTrendsScreen({
  expenses,
  members,
  currency,
  initialProductTitle,
  onSelectExpense,
}: PriceTrendsScreenProps) {
  const { colors, categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PriceFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  const histories = useMemo(() => buildProductPriceHistories(expenses), [expenses]);
  const expenseMap = useMemo(
    () => new Map(expenses.map((expense) => [expense.id, expense])),
    [expenses]
  );
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  useEffect(() => {
    if (initialProductTitle) {
      const targetKey = initialProductTitle.trim().toLowerCase();
      if (histories.some((item) => item.key === targetKey)) {
        setSelectedKey(targetKey);
        setInspectedIndex(null);
        return;
      }
    }
    if (!selectedKey || !histories.some((item) => item.key === selectedKey)) {
      setSelectedKey(histories[0]?.key ?? '');
      setInspectedIndex(null);
    }
  }, [histories, initialProductTitle, selectedKey]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return histories.filter((item) => {
      if (filter === 'up' && item.changePercent <= 0) return false;
      if (filter === 'down' && item.changePercent >= 0) return false;
      if (filter === 'multi' && item.points.length < 2) return false;
      if (!search) return true;
      return `${item.title} ${item.category} ${item.subcategory}`.toLowerCase().includes(search);
    });
  }, [filter, histories, query]);

  const activeProduct: ProductPriceHistory | null =
    histories.find((item) => item.key === selectedKey) ?? filtered[0] ?? histories[0] ?? null;

  const currencySymbol = CURRENCY_SYMBOLS[currency];
  const formatCompactPrice = (value: number): string => {
    if (value >= 1_000_000) return `${currencySymbol}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${currencySymbol}${(value / 1_000).toFixed(1)}k`;
    return `${currencySymbol}${value.toFixed(value < 10 ? 2 : 0)}`;
  };

  const chartPoints: LineChartPoint[] = activeProduct
    ? activeProduct.points.map((point, index) => ({
        key: point.id,
        label: displayDate(point.date).slice(0, 6),
        value: point.unitPrice,
        highlight: index === activeProduct.points.length - 1,
      }))
    : [];

  const inspectedPoint =
    activeProduct && inspectedIndex !== null ? activeProduct.points[inspectedIndex] ?? null : null;

  const selectProduct = (key: string) => {
    setSelectedKey(key);
    setInspectedIndex(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const renderChangePill = (percent: number, pointsCount: number) => {
    if (pointsCount < 2) {
      return (
        <View style={[styles.changeBadge, styles.changeBadgeNeutral]}>
          <Text style={[styles.changeBadgeText, styles.changeTextNeutral]}>1 entry</Text>
        </View>
      );
    }
    if (percent > 0) {
      return (
        <View style={[styles.changeBadge, styles.changeBadgeUp]}>
          <Text style={[styles.changeBadgeText, styles.changeTextUp]}>↑ {percent}%</Text>
        </View>
      );
    }
    if (percent < 0) {
      return (
        <View style={[styles.changeBadge, styles.changeBadgeDown]}>
          <Text style={[styles.changeBadgeText, styles.changeTextDown]}>
            ↓ {Math.abs(percent)}%
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.changeBadge, styles.changeBadgeNeutral]}>
        <Text style={[styles.changeBadgeText, styles.changeTextNeutral]}>0% steady</Text>
      </View>
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>UNIT PRICE TRACKER</Text>
      <Text style={styles.pageTitle}>Product price trends</Text>
      <Text style={styles.pageSubtitle}>
        See how each item’s unit price has changed across your purchases over time.
      </Text>

      {histories.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No product history yet</Text>
          <Text style={styles.emptyText}>
            Add expenses with product names, quantities, and units to track how prices change over time.
          </Text>
        </View>
      ) : (
        <>
          {activeProduct ? (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.categoryIconBox,
                    {
                      backgroundColor:
                        categoryColors[activeProduct.category]?.bg ?? colors.primaryLight,
                    },
                  ]}
                >
                  <AppIcon
                    name={getCategoryIcon(activeProduct.category)}
                    color={categoryColors[activeProduct.category]?.fg ?? colors.primary}
                    size={18}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {activeProduct.title}
                  </Text>
                  <Text style={styles.productSubtitle}>
                    {activeProduct.category} · {activeProduct.subcategory} · per {activeProduct.unit}
                  </Text>
                </View>
                {renderChangePill(activeProduct.changePercent, activeProduct.points.length)}
              </View>

              <View style={styles.priceHeadlineRow}>
                <View>
                  <Text style={styles.headlinePrice}>
                    {formatMoney(activeProduct.latestPrice, currency)}
                    <Text style={styles.headlineUnit}> / {activeProduct.unit}</Text>
                  </Text>
                  <Text style={styles.headlineCaption}>
                    {activeProduct.points.length >= 2
                      ? `From ${formatMoney(activeProduct.firstPrice, currency)} on ${displayDate(activeProduct.firstDate)}`
                      : `Recorded on ${displayDate(activeProduct.latestDate)}`}
                  </Text>
                </View>
                <Text style={styles.purchaseCountPill}>
                  {activeProduct.points.length}{' '}
                  {activeProduct.points.length === 1 ? 'purchase' : 'purchases'}
                </Text>
              </View>

              <View style={styles.rangeStatsRow}>
                <View style={styles.rangeStatBox}>
                  <Text style={styles.rangeStatLabel}>Lowest</Text>
                  <Text style={styles.rangeStatValue}>
                    {formatMoney(activeProduct.minPrice, currency)}
                  </Text>
                </View>
                <View style={styles.rangeStatDivider} />
                <View style={styles.rangeStatBox}>
                  <Text style={styles.rangeStatLabel}>Average</Text>
                  <Text style={styles.rangeStatValue}>
                    {formatMoney(activeProduct.avgPrice, currency)}
                  </Text>
                </View>
                <View style={styles.rangeStatDivider} />
                <View style={styles.rangeStatBox}>
                  <Text style={styles.rangeStatLabel}>Highest</Text>
                  <Text style={styles.rangeStatValue}>
                    {formatMoney(activeProduct.maxPrice, currency)}
                  </Text>
                </View>
              </View>

              {inspectedPoint ? (
                <View style={styles.inspectedBanner}>
                  <Text style={styles.inspectedText}>
                    {displayDate(inspectedPoint.date)}: {formatMoney(inspectedPoint.unitPrice, currency)}/{inspectedPoint.normalizedUnit} ({inspectedPoint.quantity} {inspectedPoint.unit} for {formatMoney(inspectedPoint.totalAmount, currency)})
                  </Text>
                </View>
              ) : null}

              {activeProduct.points.length >= 2 ? (
                <TrendLineChart
                  points={chartPoints}
                  lineColor={
                    activeProduct.changePercent > 0
                      ? colors.danger
                      : activeProduct.changePercent < 0
                        ? colors.success
                        : colors.primary
                  }
                  referenceValue={activeProduct.avgPrice}
                  referenceLabel={`Avg ${formatCompactPrice(activeProduct.avgPrice)}`}
                  selectedIndex={inspectedIndex}
                  onSelectPoint={(idx) =>
                    setInspectedIndex((current) => (current === idx ? null : idx))
                  }
                  formatShortValue={formatCompactPrice}
                  showAllLabels={activeProduct.points.length <= 6}
                />
              ) : (
                <View style={styles.singleEntryNotice}>
                  <Text style={styles.singleEntryText}>
                    Add one more “{activeProduct.title}” entry later to see a price change line chart.
                  </Text>
                </View>
              )}

              <Text style={styles.historySubheading}>PURCHASE TIMELINE</Text>
              {[...activeProduct.points].reverse().map((point, index, arr) => {
                const matchedExpense = expenseMap.get(point.id);
                return (
                  <Pressable
                    key={point.id}
                    style={[styles.timelineRow, index === arr.length - 1 && styles.timelineRowLast]}
                    onPress={() => {
                      if (matchedExpense) onSelectExpense(matchedExpense);
                    }}
                    disabled={!matchedExpense}
                    accessibilityRole={matchedExpense ? 'button' : undefined}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.timelineDate}>
                        {displayDate(point.date)} · {memberNames.get(point.paidBy) || 'Family'}
                      </Text>
                      <Text style={styles.timelineDetail}>
                        {point.quantity} {point.unit} · Paid {formatMoney(point.totalAmount, currency)}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelineUnitPrice}>
                        {formatMoney(point.unitPrice, currency)}/{point.normalizedUnit}
                      </Text>
                      {point.deltaPercentFromPrev !== null ? (
                        <Text
                          style={[
                            styles.timelineDelta,
                            point.deltaPercentFromPrev > 0
                              ? styles.deltaUp
                              : point.deltaPercentFromPrev < 0
                                ? styles.deltaDown
                                : styles.deltaFlat,
                          ]}
                        >
                          {point.deltaPercentFromPrev > 0
                            ? `↑ ${point.deltaPercentFromPrev}% vs prev`
                            : point.deltaPercentFromPrev < 0
                              ? `↓ ${Math.abs(point.deltaPercentFromPrev)}% vs prev`
                              : 'Same as prev'}
                        </Text>
                      ) : (
                        <Text style={styles.timelineDelta}>Baseline</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <SectionHeading title={`All products (${filtered.length})`} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products or categories"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Search products"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {(
              [
                ['all', 'All'],
                ['multi', 'Tracked 2+'],
                ['up', 'Price up ↑'],
                ['down', 'Price down ↓'],
              ] as [PriceFilter, string][]
            ).map(([key, label]) => (
              <ChoiceChip
                key={key}
                label={label}
                selected={filter === key}
                onPress={() => setFilter(key)}
              />
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching products</Text>
              <Text style={styles.emptyText}>Try clearing the filter or search query.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {filtered.map((item, index) => {
                const selected = activeProduct?.key === item.key;
                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.productRow,
                      selected && styles.productRowSelected,
                      index === filtered.length - 1 && styles.productRowLast,
                    ]}
                    onPress={() => selectProduct(item.key)}
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.rowIconBox,
                        {
                          backgroundColor:
                            categoryColors[item.category]?.bg ?? colors.primaryLight,
                        },
                      ]}
                    >
                      <AppIcon
                        name={getCategoryIcon(item.category)}
                        color={categoryColors[item.category]?.fg ?? colors.primary}
                        size={16}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {item.points.length}{' '}
                        {item.points.length === 1 ? 'buy' : 'buys'} ·{' '}
                        {item.points.length >= 2
                          ? `${formatMoney(item.firstPrice, currency)} → ${formatMoney(item.latestPrice, currency)}/${item.unit}`
                          : `${formatMoney(item.latestPrice, currency)}/${item.unit}`}
                      </Text>
                    </View>
                    {renderChangePill(item.changePercent, item.points.length)}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
    eyebrow: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    pageTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    pageSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 18 },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    categoryIconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    productTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
    productSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
    priceHeadlineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 14,
      gap: 10,
    },
    headlinePrice: { color: colors.ink, fontSize: 25, fontWeight: '900' },
    headlineUnit: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    headlineCaption: { color: colors.muted, fontSize: 11, marginTop: 3 },
    purchaseCountPill: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 9,
    },
    rangeStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceTint,
      borderRadius: 13,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginTop: 14,
    },
    rangeStatBox: { flex: 1, alignItems: 'center' },
    rangeStatDivider: { width: 1, height: 22, backgroundColor: colors.border },
    rangeStatLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
    rangeStatValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
    inspectedBanner: {
      marginTop: 10,
      backgroundColor: colors.primaryLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    inspectedText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    singleEntryNotice: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    singleEntryText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    historySubheading: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 6,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    timelineRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
    timelineDate: { color: colors.ink, fontSize: 12, fontWeight: '700' },
    timelineDetail: { color: colors.muted, fontSize: 11, marginTop: 2 },
    timelineRight: { alignItems: 'flex-end' },
    timelineUnitPrice: { color: colors.ink, fontSize: 13, fontWeight: '800' },
    timelineDelta: { fontSize: 10, fontWeight: '700', marginTop: 2, color: colors.muted },
    deltaUp: { color: colors.danger },
    deltaDown: { color: colors.success },
    deltaFlat: { color: colors.muted },

    searchInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      minHeight: 46,
      paddingHorizontal: 14,
      color: colors.ink,
      marginBottom: 10,
    },
    filterChips: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    productRowSelected: { backgroundColor: colors.primaryLight },
    productRowLast: { borderBottomWidth: 0 },
    rowIconBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    rowMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    changeBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
    changeBadgeUp: { backgroundColor: colors.dangerLight },
    changeBadgeDown: { backgroundColor: colors.successLight },
    changeBadgeNeutral: { backgroundColor: colors.surfaceTint },
    changeBadgeText: { fontSize: 11, fontWeight: '800' },
    changeTextUp: { color: colors.danger },
    changeTextDown: { color: colors.success },
    changeTextNeutral: { color: colors.muted },
    emptyCard: {
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 15, marginBottom: 6 },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  });
