import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Expense, FamilyMember, Preferences } from '../models';
import {
  CURRENCY_SYMBOLS,
  displayDate,
  formatMoney,
  sanitizeQuantityInput,
} from '../models';
import { buildDashboardSummary } from '../dashboardUtils';
import { buildProductPriceHistories } from '../priceUtils';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from '../components/AppIcon';
import type { AppIconName } from '../components/AppIcon';
import { getCategoryIcon, getSubcategoryIcon } from '../components/categoryIcons';
import { DonutChart, TrendLineChart } from '../components/Charts';
import type { LineChartPoint } from '../components/Charts';
import { ExpenseRow } from '../components/ExpenseRow';
import { SectionHeading } from '../components/SectionHeading';
import { DASHBOARD_CHART_COLORS } from './types';

type DashboardScreenProps = {
  expenses: Expense[];
  members: FamilyMember[];
  preferences: Preferences;
  onAddExpense: () => void;
  onShowExpenses: () => void;
  onOpenReports: () => void;
  onOpenPrices: (productTitle?: string) => void;
  onOpenFamily: () => void;
  onSavePreferences: (preferences: Preferences) => Promise<void>;
  onSelectExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

export function DashboardScreen({
  expenses,
  members,
  preferences,
  onAddExpense,
  onShowExpenses,
  onOpenReports,
  onOpenPrices,
  onOpenFamily,
  onSavePreferences,
  onSelectExpense,
  onDeleteExpense,
}: DashboardScreenProps) {
  const { colors, categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [trendMode, setTrendMode] = useState<'7d' | '6m' | 'pace'>('7d');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const summary = useMemo(
    () => buildDashboardSummary(expenses, members, preferences),
    [expenses, members, preferences]
  );

  const priceMovers = useMemo(
    () =>
      buildProductPriceHistories(expenses)
        .filter((item) => item.points.length >= 2)
        .slice(0, 3),
    [expenses]
  );

  const openBudgetModal = () => {
    setBudgetInput(preferences.monthlyBudget ? String(preferences.monthlyBudget) : '');
    setBudgetModalOpen(true);
  };

  const saveBudget = async (clear = false) => {
    const trimmed = clear ? '' : budgetInput.trim();
    const parsed = trimmed ? Number(trimmed) : undefined;
    if (
      trimmed &&
      (!Number.isFinite(parsed) || (parsed ?? 0) <= 0 || (parsed ?? 0) > 100_000_000)
    ) {
      Alert.alert('Check monthly budget', 'Enter a positive budget amount.');
      return;
    }
    setSavingBudget(true);
    try {
      await onSavePreferences({ ...preferences, monthlyBudget: parsed });
      setBudgetModalOpen(false);
    } catch (error) {
      Alert.alert(
        'Could not save budget',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSavingBudget(false);
    }
  };

  const visibleCategories = showAllCategories
    ? summary.categoryTotals
    : summary.categoryTotals.slice(0, 5);
  const topCategory = summary.categoryTotals[0] ?? null;
  const currency = preferences.currency;
  const currencySymbol = CURRENCY_SYMBOLS[currency];
  const sixMonthTotal = summary.sixMonthSpending.reduce((sum, item) => sum + item.total, 0);

  const formatCompactAmount = (value: number): string => {
    if (value >= 1_000_000) return `${currencySymbol}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${currencySymbol}${(value / 1_000).toFixed(1)}k`;
    return `${currencySymbol}${Math.round(value)}`;
  };

  const trendPoints: LineChartPoint[] =
    trendMode === '7d'
      ? summary.weekSpending.map((day) => ({
          key: day.date,
          label: day.label,
          value: day.total,
          highlight: day.date === summary.todayKey,
        }))
      : trendMode === '6m'
        ? summary.sixMonthSpending.map((month) => ({
            key: month.monthKey,
            label: month.label,
            value: month.total,
            highlight: month.isCurrent,
          }))
        : summary.cumulativePace.points.map((point) => ({
            key: `day-${point.day}`,
            label: point.label,
            value: point.actual,
            comparison: point.comparison,
            highlight: point.day === summary.daysElapsed,
          }));

  const inspectedPoint =
    selectedPointIndex !== null && trendPoints[selectedPointIndex]
      ? trendPoints[selectedPointIndex]
      : null;

  const activeCategory =
    selectedCategoryIndex !== null && summary.categoryTotals[selectedCategoryIndex]
      ? summary.categoryTotals[selectedCategoryIndex]
      : null;

  const categorySlices = summary.categoryTotals.map((item, index) => ({
    key: item.category,
    label: item.category,
    value: item.total,
    color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
  }));

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.greetingRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
          <Text style={styles.greeting}>Hello, {preferences.displayName}</Text>
          <Text style={styles.greetingSub}>{summary.monthLabel} overview</Text>
        </View>
        <Pressable
          style={styles.familyBadge}
          onPress={onOpenFamily}
          accessibilityRole="button"
          accessibilityLabel="Open family members"
        >
          <AppIcon name="family" color={colors.primary} size={14} />
          <Text style={styles.familyBadgeText}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryDecorOne} />
        <View style={styles.summaryDecorTwo} />
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryLabel}>TOTAL SPENT · {summary.monthLabel.toUpperCase()}</Text>
          {summary.momDeltaPercent !== null ? (
            <View
              style={[
                styles.momBadge,
                summary.momDeltaAmount <= 0 ? styles.momBadgeGood : styles.momBadgeWarn,
              ]}
            >
              <Text
                style={[
                  styles.momBadgeText,
                  summary.momDeltaAmount <= 0 ? styles.momTextGood : styles.momTextWarn,
                ]}
              >
                {summary.momDeltaAmount <= 0 ? '↓' : '↑'} {Math.abs(summary.momDeltaPercent)}% vs{' '}
                {summary.prevMonthLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.momBadgeNeutral}>
              <Text style={styles.momBadgeTextNeutral}>
                Day {summary.daysElapsed} of {summary.daysInMonth}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.summaryAmount}>{formatMoney(summary.monthTotal, currency)}</Text>

        <View style={styles.heroStatsStrip}>
          <View style={styles.heroStatCell}>
            <Text style={styles.heroStatLabel}>Today</Text>
            <Text style={styles.heroStatValue} numberOfLines={1}>
              {formatMoney(summary.todayTotal, currency)}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatCell}>
            <Text style={styles.heroStatLabel}>This week</Text>
            <Text style={styles.heroStatValue} numberOfLines={1}>
              {formatMoney(summary.thisWeekTotal, currency)}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatCell}>
            <Text style={styles.heroStatLabel}>Projected</Text>
            <Text style={styles.heroStatValue} numberOfLines={1}>
              {formatMoney(summary.projectedMonthTotal, currency)}
            </Text>
          </View>
        </View>

        {summary.budget ? (
          <View style={styles.budgetPanel}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>
                Budget {formatMoney(summary.budget.limit, currency)} · {summary.budget.usedPercent}% used
              </Text>
              <Pressable onPress={openBudgetModal} style={styles.budgetEditButton}>
                <Text style={styles.budgetEditText}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${Math.min(100, Math.max(3, summary.budget.usedPercent))}%`,
                    backgroundColor:
                      summary.budget.tone === 'over_budget'
                        ? '#F6A5A5'
                        : summary.budget.tone === 'near_limit'
                          ? '#F5CB7A'
                          : '#9EE4C8',
                  },
                ]}
              />
            </View>
            <View style={styles.budgetFooter}>
              <Text style={styles.budgetDetail}>
                {summary.budget.remaining >= 0
                  ? `${formatMoney(summary.budget.remaining, currency)} remaining`
                  : `Over by ${formatMoney(Math.abs(summary.budget.remaining), currency)}`}
              </Text>
              <Text style={styles.budgetDetail}>
                {summary.budget.remaining > 0
                  ? `${formatMoney(summary.budget.safeDailyPace, currency)}/day safe pace`
                  : `${summary.daysRemaining}d left in month`}
              </Text>
            </View>
          </View>
        ) : (
                  <Pressable style={styles.budgetPrompt} onPress={openBudgetModal} accessibilityRole="button">
            <View style={styles.budgetPromptLeft}>
              <AppIcon name="target" color={colors.primarySoftText} size={16} />
              <Text style={styles.budgetPromptText}>
                Set a monthly budget to track remaining & daily pace
              </Text>
            </View>
            <Text style={styles.budgetPromptAction}>Set budget</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.quickActionsRow}>
        {(
          [
            ['Add', 'add', onAddExpense, true],
            ['Expenses', 'list', onShowExpenses, false],
            ['Prices', 'trend', () => onOpenPrices(), false],
            ['Reports', 'chart', onOpenReports, false],
          ] as [string, AppIconName, () => void, boolean][]
        ).map(([label, icon, onPress, primary]) => (
          <Pressable
            key={label}
            style={[styles.quickActionButton, primary && styles.quickActionPrimary]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <View style={[styles.quickActionIcon, primary && styles.quickActionIconPrimary]}>
              <AppIcon name={icon} color={primary ? colors.onPrimary : colors.primary} size={16} />
            </View>
            <Text style={[styles.quickActionLabel, primary && styles.quickActionLabelPrimary]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBadge, { backgroundColor: colors.primaryLight }]}>
              <AppIcon name="trend" color={colors.primary} size={15} />
            </View>
            <Text style={styles.kpiTag}>{summary.activeSpendDays}d active</Text>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {formatMoney(summary.dailyAverage, currency)}
          </Text>
          <Text style={styles.kpiLabel}>Daily avg · {summary.noSpendDays} no-spend</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBadge, { backgroundColor: colors.amberLight }]}>
              <AppIcon name="chart" color={colors.amber} size={15} />
            </View>
            <Text style={styles.kpiTag}>{summary.monthCount} entries</Text>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {formatMoney(summary.averageTicket, currency)}
          </Text>
          <Text style={styles.kpiLabel}>Average per expense</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIconBadge,
                {
                  backgroundColor: topCategory
                    ? categoryColors[topCategory.category]?.bg ?? colors.secondaryLight
                    : colors.secondaryLight,
                },
              ]}
            >
              <AppIcon
                name={topCategory ? getCategoryIcon(topCategory.category) : 'wallet'}
                color={
                  topCategory
                    ? categoryColors[topCategory.category]?.fg ?? colors.secondary
                    : colors.secondary
                }
                size={15}
              />
            </View>
            <Text style={styles.kpiTag}>{topCategory ? `${topCategory.percent}% share` : 'Top'}</Text>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {topCategory ? topCategory.category : 'No data yet'}
          </Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {topCategory ? formatMoney(topCategory.total, currency) : 'Top category this month'}
          </Text>
        </View>

        <Pressable
          style={styles.kpiCard}
          onPress={() => {
            if (summary.largestExpense) onSelectExpense(summary.largestExpense);
          }}
          disabled={!summary.largestExpense}
          accessibilityRole={summary.largestExpense ? 'button' : undefined}
        >
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBadge, { backgroundColor: colors.dangerLight }]}>
              <AppIcon name="target" color={colors.danger} size={15} />
            </View>
            <Text style={styles.kpiTag}>Biggest</Text>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {summary.largestExpense ? formatMoney(summary.largestExpense.amount, currency) : '—'}
          </Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {summary.largestExpense ? summary.largestExpense.title : 'Largest expense'}
          </Text>
        </Pressable>
      </View>

      {summary.insights.length > 0 ? (
        <>
          <SectionHeading title="Spending pulse" />
          <View style={styles.insightCard}>
            {summary.insights.map((insight, index) => (
              <View
                key={insight.id}
                style={[styles.insightRow, index === summary.insights.length - 1 && styles.insightRowLast]}
              >
                <View
                  style={[
                    styles.insightDot,
                    {
                      backgroundColor:
                        insight.tone === 'positive'
                          ? colors.success
                          : insight.tone === 'warning'
                            ? colors.amber
                            : colors.secondary,
                    },
                  ]}
                />
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeading title="Spending trend" action="Full report" onAction={onOpenReports} />
      <View style={styles.chartCard} accessibilityLabel="Spending trend chart">
        <View style={styles.chartSummary}>
          <View style={styles.flex}>
            <Text style={styles.chartTotal}>
              {formatMoney(
                trendMode === '7d'
                  ? summary.weekTotal
                  : trendMode === '6m'
                    ? sixMonthTotal
                    : summary.monthTotal,
                currency
              )}
            </Text>
            <Text style={styles.chartCaption}>
              {trendMode === '7d'
                ? `Past 7 days · avg ${formatMoney(summary.weekDailyAverage, currency)}/day`
                : trendMode === '6m'
                  ? `Last 6 months · avg ${formatMoney(summary.sixMonthAverage, currency)}/mo`
                  : summary.cumulativePace.comparisonKind === 'prev_month'
                    ? `Cumulative pace vs ${summary.prevMonthLabel}`
                    : summary.cumulativePace.comparisonKind === 'budget'
                      ? 'Cumulative pace vs monthly budget'
                      : `Cumulative spend through day ${summary.daysElapsed}`}
            </Text>
          </View>
          <View style={styles.chartControls}>
            <View style={styles.segmentedControl}>
              {(
                [
                  ['7d', '7D'],
                  ['6m', '6M'],
                  ['pace', 'Pace'],
                ] as ['7d' | '6m' | 'pace', string][]
              ).map(([mode, label]) => (
                <Pressable
                  key={mode}
                  style={[styles.segmentButton, trendMode === mode && styles.segmentButtonActive]}
                  onPress={() => {
                    setTrendMode(mode);
                    setSelectedPointIndex(null);
                  }}
                >
                  <Text style={[styles.segmentText, trendMode === mode && styles.segmentTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {trendMode !== 'pace' ? (
              <View style={styles.segmentedControl}>
                {(
                  [
                    ['line', 'Line'],
                    ['bar', 'Bar'],
                  ] as ['line' | 'bar', string][]
                ).map(([type, label]) => (
                  <Pressable
                    key={type}
                    style={[styles.segmentButton, chartType === type && styles.segmentButtonActive]}
                    onPress={() => setChartType(type)}
                  >
                    <Text style={[styles.segmentText, chartType === type && styles.segmentTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.chartMetaRow}>
          {inspectedPoint ? (
            <View style={styles.peakBanner}>
              <Text style={styles.peakBannerText}>
                {trendMode === 'pace' ? `Day ${inspectedPoint.label}` : inspectedPoint.label}:{' '}
                {formatMoney(inspectedPoint.value, currency)}
                {inspectedPoint.comparison !== undefined && inspectedPoint.comparison !== null
                  ? ` (vs ${formatMoney(inspectedPoint.comparison, currency)})`
                  : ''}
              </Text>
            </View>
          ) : trendMode === '7d' && summary.peakWeekDay ? (
            <View style={styles.peakBanner}>
              <Text style={styles.peakBannerText}>
                Peak: {summary.peakWeekDay.label} ({formatMoney(summary.peakWeekDay.total, currency)})
              </Text>
            </View>
          ) : trendMode === 'pace' && summary.cumulativePace.comparisonKind !== 'none' ? (
            <View style={styles.paceLegendRow}>
              <View style={styles.paceLegendItem}>
                <View style={[styles.paceLegendSwatch, { backgroundColor: colors.primary }]} />
                <Text style={styles.paceLegendText}>This month</Text>
              </View>
              <View style={styles.paceLegendItem}>
                <View style={[styles.paceLegendSwatch, { backgroundColor: colors.secondary }]} />
                <Text style={styles.paceLegendText}>
                  {summary.cumulativePace.comparisonKind === 'prev_month'
                    ? summary.prevMonthLabel
                    : 'Budget pace'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {trendMode === 'pace' || chartType === 'line' ? (
          <TrendLineChart
            points={trendPoints}
            lineColor={colors.primary}
            comparisonColor={colors.secondary}
            referenceValue={
              trendMode === '7d'
                ? summary.weekDailyAverage
                : trendMode === '6m'
                  ? summary.sixMonthAverage
                  : undefined
            }
            referenceLabel={
              trendMode === '7d' && summary.weekDailyAverage > 0
                ? `Avg ${formatCompactAmount(summary.weekDailyAverage)}`
                : trendMode === '6m' && summary.sixMonthAverage > 0
                  ? `Avg ${formatCompactAmount(summary.sixMonthAverage)}`
                  : undefined
            }
            selectedIndex={selectedPointIndex}
            onSelectPoint={(idx) =>
              setSelectedPointIndex((current) => (current === idx ? null : idx))
            }
            formatShortValue={formatCompactAmount}
            showAllLabels={trendMode !== 'pace'}
          />
        ) : trendMode === '7d' ? (
          <View style={styles.weekChart}>
            {summary.weekSpending.map((day) => (
              <View key={day.date} style={styles.weekColumn}>
                <Text style={styles.weekAmount} numberOfLines={1}>
                  {day.total > 0 ? formatMoney(day.total, currency) : ''}
                </Text>
                <View style={styles.weekBarTrack}>
                  <View
                    style={[
                      styles.weekBar,
                      {
                        height: day.total > 0 ? Math.max(8, (day.total / summary.maxDay) * 76) : 3,
                        backgroundColor:
                          day.date === summary.todayKey
                            ? colors.primary
                            : day.total > 0
                              ? colors.primaryMid
                              : colors.track,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.weekDay, day.date === summary.todayKey && styles.weekDayToday]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.weekChart}>
            {summary.sixMonthSpending.map((month) => (
              <View key={month.monthKey} style={styles.weekColumn}>
                <Text style={styles.weekAmount} numberOfLines={1}>
                  {month.total > 0 ? formatMoney(month.total, currency) : ''}
                </Text>
                <View style={styles.weekBarTrack}>
                  <View
                    style={[
                      styles.weekBar,
                      {
                        height:
                          month.total > 0
                            ? Math.max(8, (month.total / summary.maxSixMonth) * 76)
                            : 3,
                        backgroundColor: month.isCurrent
                          ? colors.primary
                          : month.total > 0
                            ? colors.secondary
                            : colors.track,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.weekDay, month.isCurrent && styles.weekDayToday]}>
                  {month.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <SectionHeading
        title="Spending by category"
        action={
          summary.categoryTotals.length > 5
            ? showAllCategories
              ? 'Top 5'
              : `All (${summary.categoryTotals.length})`
            : undefined
        }
        onAction={
          summary.categoryTotals.length > 5
            ? () => setShowAllCategories((current) => !current)
            : undefined
        }
      />
      {summary.categoryTotals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your month starts here</Text>
          <Text style={styles.emptyText}>Add an expense to see category shares and trends.</Text>
        </View>
      ) : (
        <View style={styles.categoryCard}>
          <View style={styles.donutSection}>
            <DonutChart
              slices={categorySlices}
              size={136}
              holeRatio={0.62}
              centerTopLabel={activeCategory ? activeCategory.category : 'Total'}
              centerValue={formatCompactAmount(
                activeCategory ? activeCategory.total : summary.monthTotal
              )}
              centerSubLabel={
                activeCategory
                  ? `${activeCategory.percent}% share`
                  : `${summary.categoryTotals.length} ${summary.categoryTotals.length === 1 ? 'category' : 'categories'}`
              }
              selectedIndex={selectedCategoryIndex}
              onSelectSlice={setSelectedCategoryIndex}
            />
            <View style={styles.donutLegend}>
              {summary.categoryTotals.slice(0, 4).map((item, index) => {
                const selected = selectedCategoryIndex === index;
                return (
                  <Pressable
                    key={item.category}
                    style={[styles.donutLegendRow, selected && styles.donutLegendRowSelected]}
                    onPress={() =>
                      setSelectedCategoryIndex((current) => (current === index ? null : index))
                    }
                  >
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length] },
                      ]}
                    />
                    <Text style={styles.donutLegendName} numberOfLines={1}>
                      {item.category}
                    </Text>
                    <Text style={styles.donutLegendPct}>{item.percent}%</Text>
                  </Pressable>
                );
              })}
              {summary.categoryTotals.length > 4 ? (
                <Text style={styles.donutLegendMore}>
                  +{summary.categoryTotals.length - 4} more below
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.categoryStack} accessibilityLabel="Monthly spending share by category">
            {summary.categoryTotals.map((item, index) => (
              <View
                key={item.category}
                style={{
                  width: `${(item.total / summary.monthTotal) * 100}%`,
                  height: 10,
                  backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                }}
              />
            ))}
          </View>
          {visibleCategories.map((item, index) => (
            <Pressable
              key={item.category}
              style={styles.categoryRow}
              onPress={() =>
                setSelectedCategoryIndex((current) => (current === index ? null : index))
              }
            >
              <View style={styles.categoryNameRow}>
                <View style={styles.categoryLabelWrap}>
                  <View
                    style={[
                      styles.categoryIconBadge,
                      {
                        backgroundColor:
                          categoryColors[item.category]?.bg ?? colors.primaryLight,
                      },
                    ]}
                  >
                    <AppIcon
                      name={getCategoryIcon(item.category)}
                      color={categoryColors[item.category]?.fg ?? colors.primary}
                      size={14}
                    />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.categoryTitleLine}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length] },
                        ]}
                      />
                      <Text style={styles.categoryName}>{item.category}</Text>
                      <Text style={styles.categoryCount}>{item.count}</Text>
                    </View>
                    {item.topSubcategory ? (
                      <View style={styles.categorySubRow}>
                        <AppIcon
                          name={getSubcategoryIcon(item.topSubcategory, item.category)}
                          color={colors.muted}
                          size={10}
                        />
                        <Text style={styles.categorySub}>Top: {item.topSubcategory}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.categoryValue}>
                  {formatMoney(item.total, currency)} · {item.percent}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(4, (item.total / summary.maxCategory) * 100)}%`,
                      backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                    },
                  ]}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {summary.topPurchases.length > 0 ? (
        <>
          <SectionHeading title="Top purchases this month" />
          <View style={styles.card}>
            {summary.topPurchases.map((expense, index) => (
              <Pressable
                key={expense.id}
                style={[styles.topPurchaseRow, index === summary.topPurchases.length - 1 && styles.topPurchaseLast]}
                onPress={() => onSelectExpense(expense)}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: categoryColors[expense.category]?.bg ?? colors.primaryLight },
                  ]}
                >
                  <AppIcon
                    name={getCategoryIcon(expense.category)}
                    color={categoryColors[expense.category]?.fg ?? colors.primary}
                    size={15}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.topPurchaseTitle} numberOfLines={1}>
                    {expense.title}
                  </Text>
                  <Text style={styles.topPurchaseMeta} numberOfLines={1}>
                    {expense.category} · {displayDate(expense.date)} ·{' '}
                    {memberNames.get(expense.paidBy) || 'Family'}
                  </Text>
                </View>
                <Text style={styles.topPurchaseAmount}>{formatMoney(expense.amount, currency)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {priceMovers.length > 0 ? (
        <>
          <SectionHeading
            title="Product price changes"
            action="All prices"
            onAction={() => onOpenPrices()}
          />
          <View style={styles.card}>
            {priceMovers.map((item, index) => (
              <Pressable
                key={item.key}
                style={[styles.topPurchaseRow, index === priceMovers.length - 1 && styles.topPurchaseLast]}
                onPress={() => onOpenPrices(item.title)}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: categoryColors[item.category]?.bg ?? colors.primaryLight },
                  ]}
                >
                  <AppIcon
                    name={getCategoryIcon(item.category)}
                    color={categoryColors[item.category]?.fg ?? colors.primary}
                    size={15}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.topPurchaseTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.topPurchaseMeta} numberOfLines={1}>
                    {formatMoney(item.firstPrice, currency)} → {formatMoney(item.latestPrice, currency)} / {item.unit} · {item.points.length} buys
                  </Text>
                </View>
                <View
                  style={[
                    styles.priceMoveBadge,
                    item.changePercent > 0
                      ? styles.priceMoveUp
                      : item.changePercent < 0
                        ? styles.priceMoveDown
                        : styles.priceMoveFlat,
                  ]}
                >
                  <Text
                    style={[
                      styles.priceMoveText,
                      item.changePercent > 0
                        ? styles.priceMoveTextUp
                        : item.changePercent < 0
                          ? styles.priceMoveTextDown
                          : styles.priceMoveTextFlat,
                    ]}
                  >
                    {item.changePercent > 0
                      ? `↑ ${item.changePercent}%`
                      : item.changePercent < 0
                        ? `↓ ${Math.abs(item.changePercent)}%`
                        : '0%'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {summary.memberTotals.length > 0 && summary.monthTotal > 0 ? (
        <>
          <SectionHeading title="Family split (this month)" action="Manage" onAction={onOpenFamily} />
          <View style={styles.categoryCard}>
            {summary.memberTotals.length > 1 ? (
              <>
                <View style={styles.categoryStack} accessibilityLabel="Family spending split">
                  {summary.memberTotals
                    .filter((item) => item.total > 0)
                    .map((item, index) => (
                      <View
                        key={item.id}
                        style={{
                          width: `${(item.total / summary.monthTotal) * 100}%`,
                          height: 10,
                          backgroundColor:
                            DASHBOARD_CHART_COLORS[(index + 1) % DASHBOARD_CHART_COLORS.length],
                        }}
                      />
                    ))}
                </View>
                <Text style={styles.equalShareNote}>
                  Equal share across {summary.memberTotals.length} members:{' '}
                  {formatMoney(summary.equalMemberShare, currency)} each
                </Text>
              </>
            ) : null}
            {summary.memberTotals.map((item, index) => (
              <View key={item.id} style={styles.categoryRow}>
                <View style={styles.categoryNameRow}>
                  <View style={styles.categoryLabelWrap}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: DASHBOARD_CHART_COLORS[(index + 1) % DASHBOARD_CHART_COLORS.length] },
                      ]}
                    />
                    <View>
                      <View style={styles.categoryTitleLine}>
                        <Text style={styles.categoryName}>{item.name}</Text>
                        <Text style={styles.categoryCount}>{item.count}</Text>
                      </View>
                      {summary.memberTotals.length > 1 ? (
                        <Text style={styles.categorySub}>
                          {item.deltaFromEqual >= 0
                            ? `+${formatMoney(item.deltaFromEqual, currency)} vs split`
                            : `-${formatMoney(Math.abs(item.deltaFromEqual), currency)} vs split`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.categoryValue}>
                    {formatMoney(item.total, currency)} · {item.percent}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width:
                          item.total > 0
                            ? `${Math.max(4, (item.total / summary.maxMember) * 100)}%`
                            : '0%',
                        backgroundColor: DASHBOARD_CHART_COLORS[(index + 1) % DASHBOARD_CHART_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeading title="Recent expenses" action="See all" onAction={onShowExpenses} />
      {summary.recent.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No expenses yet. Your entries stay private on this device.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {summary.recent.map((expense, index) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              memberName={memberNames.get(expense.paidBy) || 'Family'}
              currency={currency}
              onPress={onSelectExpense}
              onDelete={onDeleteExpense}
              last={index === summary.recent.length - 1}
            />
          ))}
        </View>
      )}
      <Text style={styles.privacyNote}>Offline by design · Your data stays on this device</Text>

      <Modal
        transparent
        visible={budgetModalOpen}
        animationType="fade"
        onRequestClose={() => setBudgetModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBudgetModalOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Monthly family budget</Text>
            <Text style={styles.modalHint}>
              Set a monthly target ({CURRENCY_SYMBOLS[currency]}) to see remaining balance and safe daily pace.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={budgetInput}
              onChangeText={(value) => setBudgetInput(sanitizeQuantityInput(value))}
              placeholder="e.g. 25000"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel="Monthly budget amount"
            />
            <View style={styles.modalActions}>
              {preferences.monthlyBudget ? (
                <Pressable
                  style={styles.modalClearButton}
                  onPress={() => void saveBudget(true)}
                  disabled={savingBudget}
                >
                  <Text style={styles.modalClearText}>Clear</Text>
                </Pressable>
              ) : null}
              <View style={styles.flex} />
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setBudgetModalOpen(false)}
                disabled={savingBudget}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSaveButton}
                onPress={() => void saveBudget(false)}
                disabled={savingBudget}
              >
                <Text style={styles.modalSaveText}>{savingBudget ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>

      <Pressable
        style={styles.floatingAddButton}
        onPress={onAddExpense}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <AppIcon name="add" color={colors.onPrimary} size={17} />
        <Text style={styles.floatingAddText}>Add expense</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pageContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 92 },
    greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
    greeting: { color: colors.ink, fontSize: 23, fontWeight: '800' },
    greetingSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    familyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryLight,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    familyBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },

    summaryCard: {
      backgroundColor: colors.heroBg,
      borderRadius: 24,
      padding: 20,
      overflow: 'hidden',
    },
    summaryDecorOne: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: '#ffffff0d',
      right: -30,
      top: -55,
    },
    summaryDecorTwo: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#ffffff0d',
      right: 34,
      bottom: -52,
    },
    summaryTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    summaryLabel: { color: colors.primarySoftText, fontWeight: '700', fontSize: 11, letterSpacing: 0.6 },
    momBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
    momBadgeGood: { backgroundColor: colors.successDark },
    momBadgeWarn: { backgroundColor: '#78350F' },
    momBadgeText: { fontSize: 11, fontWeight: '800' },
    momTextGood: { color: '#A7F3D0' },
    momTextWarn: { color: '#FDE68A' },
    momBadgeNeutral: {
      backgroundColor: '#ffffff1c',
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    momBadgeTextNeutral: { color: colors.primarySoftText, fontSize: 11, fontWeight: '700' },
    summaryAmount: { color: colors.onPrimary, fontSize: 34, fontWeight: '800', marginTop: 8 },
    heroStatsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.heroSubBg,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 16,
    },
    heroStatCell: { flex: 1, alignItems: 'center' },
    heroStatDivider: { width: 1, height: 24, backgroundColor: '#ffffff24' },
    heroStatLabel: { color: colors.primarySoftText, fontSize: 10, fontWeight: '600' },
    heroStatValue: { color: colors.onPrimary, fontSize: 13, fontWeight: '800', marginTop: 3 },

    budgetPanel: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#ffffff24',
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    budgetLabel: { color: colors.primarySoftText, fontSize: 12, fontWeight: '700' },
    budgetEditButton: {
      backgroundColor: '#ffffff22',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    budgetEditText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
    budgetTrack: {
      height: 8,
      borderRadius: 5,
      backgroundColor: colors.heroSubBg,
      overflow: 'hidden',
    },
    budgetFill: { height: 8, borderRadius: 5 },
    budgetFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 7,
      gap: 8,
    },
    budgetDetail: { color: colors.primarySoftText, fontSize: 11, fontWeight: '600' },
    budgetPrompt: {
      marginTop: 14,
      backgroundColor: colors.heroSubBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    budgetPromptLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    budgetPromptText: { color: colors.primarySoftText, fontSize: 11, flex: 1 },
    budgetPromptAction: { color: colors.primaryAccentText, fontSize: 11, fontWeight: '800' },

    quickActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 11,
      alignItems: 'center',
      gap: 6,
    },
    quickActionPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickActionIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionIconPrimary: {
      backgroundColor: '#ffffff24',
    },
    quickActionLabel: { color: colors.ink, fontSize: 11, fontWeight: '700' },
    quickActionLabelPrimary: { color: colors.onPrimary, fontWeight: '800' },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
    },
    kpiCard: {
      width: '48.5%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 17,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kpiHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    kpiIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiTag: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      backgroundColor: colors.surfaceTint,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    kpiValue: { color: colors.ink, fontSize: 16, fontWeight: '800' },
    kpiLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },

    insightCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 15,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    insightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    insightRowLast: { borderBottomWidth: 0 },
    insightDot: { width: 8, height: 8, borderRadius: 4 },
    insightText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '500' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 15,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    chartTotal: { color: colors.ink, fontSize: 20, fontWeight: '800' },
    chartCaption: { color: colors.muted, fontSize: 11, marginTop: 2 },
    chartControls: { alignItems: 'flex-end', gap: 6 },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceTint,
      borderRadius: 10,
      padding: 3,
    },
    segmentButton: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
    segmentButtonActive: { backgroundColor: colors.surface },
    segmentText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    segmentTextActive: { color: colors.primary, fontWeight: '800' },
    chartMetaRow: { marginTop: 10, minHeight: 24, justifyContent: 'center' },
    peakBanner: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9,
    },
    peakBannerText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    paceLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    paceLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    paceLegendSwatch: { width: 12, height: 4, borderRadius: 2 },
    paceLegendText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    weekChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 },
    weekColumn: { flex: 1, alignItems: 'center', minWidth: 0 },
    weekAmount: { color: colors.muted, fontSize: 8, height: 12, textAlign: 'center', width: '100%' },
    weekBarTrack: { height: 80, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
    weekBar: { width: '100%', minHeight: 3, borderRadius: 6 },
    weekDay: { color: colors.muted, fontSize: 10, marginTop: 7 },
    weekDayToday: { color: colors.primary, fontWeight: '800' },

    categoryCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 15,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    donutSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    donutLegend: { flex: 1, gap: 6 },
    donutLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    donutLegendRowSelected: { backgroundColor: colors.primaryLight },
    donutLegendName: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '600' },
    donutLegendPct: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    donutLegendMore: { color: colors.muted, fontSize: 11, paddingHorizontal: 6, marginTop: 2 },
    categoryStack: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
    categoryRow: { marginVertical: 10 },
    categoryNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 8 },
    categoryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
    categoryIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    categoryCount: {
      color: colors.muted,
      fontSize: 10,
      backgroundColor: colors.surfaceTint,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 7,
    },
    categoryName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    categorySubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    categorySub: { color: colors.muted, fontSize: 11 },
    categoryValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
    progressTrack: { height: 7, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' },
    progressFill: { height: 7, borderRadius: 5, backgroundColor: colors.primaryMid },

    topPurchaseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topPurchaseLast: { borderBottomWidth: 0 },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
    topPurchaseTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    topPurchaseMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    topPurchaseAmount: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    priceMoveBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
    priceMoveUp: { backgroundColor: colors.dangerLight },
    priceMoveDown: { backgroundColor: colors.successLight },
    priceMoveFlat: { backgroundColor: colors.surfaceTint },
    priceMoveText: { fontSize: 11, fontWeight: '800' },
    priceMoveTextUp: { color: colors.danger },
    priceMoveTextDown: { color: colors.success },
    priceMoveTextFlat: { color: colors.muted },

    equalShareNote: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 6,
    },

    emptyCard: {
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 15, marginBottom: 6 },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    privacyNote: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 22 },

    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
    modalHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
    modalInput: {
      minHeight: 48,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 13,
      color: colors.ink,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 14,
    },
    modalActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    modalClearButton: { paddingVertical: 10, paddingHorizontal: 10 },
    modalClearText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
    modalCancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
    modalCancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    modalSaveButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 18,
    },
    modalSaveText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
    floatingAddButton: {
      position: 'absolute',
      right: 20,
      bottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.primary,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 13,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 10,
    },
    floatingAddText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
  });
