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
import { COLORS } from '../theme';
import { AppIcon } from '../components/AppIcon';
import type { AppIconName } from '../components/AppIcon';
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
  onOpenFamily,
  onSavePreferences,
  onSelectExpense,
  onDeleteExpense,
}: DashboardScreenProps) {
  const [trendMode, setTrendMode] = useState<'7d' | '6m'>('7d');
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
  const sixMonthTotal = summary.sixMonthSpending.reduce((sum, item) => sum + item.total, 0);

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
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
          <AppIcon name="family" color={COLORS.primary} size={14} />
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
              <AppIcon name="target" color="#D5EAE1" size={16} />
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
            ['Reports', 'chart', onOpenReports, false],
            ['Family', 'family', onOpenFamily, false],
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
              <AppIcon name={icon} color={primary ? COLORS.white : COLORS.primary} size={16} />
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
            <View style={[styles.kpiIconBadge, { backgroundColor: '#E7F3EE' }]}>
              <AppIcon name="trend" color={COLORS.primary} size={15} />
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
            <View style={[styles.kpiIconBadge, { backgroundColor: '#FDF2E3' }]}>
              <AppIcon name="chart" color={COLORS.amber} size={15} />
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
            <View style={[styles.kpiIconBadge, { backgroundColor: '#EBF3FB' }]}>
              <AppIcon name="wallet" color="#3A75B5" size={15} />
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
            <View style={[styles.kpiIconBadge, { backgroundColor: '#FBECEC' }]}>
              <AppIcon name="target" color={COLORS.danger} size={15} />
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
                          ? COLORS.primary
                          : insight.tone === 'warning'
                            ? COLORS.amber
                            : '#528AC7',
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
              {formatMoney(trendMode === '7d' ? summary.weekTotal : sixMonthTotal, currency)}
            </Text>
            <Text style={styles.chartCaption}>
              {trendMode === '7d'
                ? `Past 7 days · avg ${formatMoney(summary.weekDailyAverage, currency)}/day`
                : `Last 6 months · avg ${formatMoney(summary.sixMonthAverage, currency)}/mo`}
            </Text>
          </View>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[styles.segmentButton, trendMode === '7d' && styles.segmentButtonActive]}
              onPress={() => setTrendMode('7d')}
            >
              <Text style={[styles.segmentText, trendMode === '7d' && styles.segmentTextActive]}>
                7D
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, trendMode === '6m' && styles.segmentButtonActive]}
              onPress={() => setTrendMode('6m')}
            >
              <Text style={[styles.segmentText, trendMode === '6m' && styles.segmentTextActive]}>
                6M
              </Text>
            </Pressable>
          </View>
        </View>

        {trendMode === '7d' && summary.peakWeekDay ? (
          <View style={styles.peakBanner}>
            <Text style={styles.peakBannerText}>
              Peak day: {summary.peakWeekDay.label} ({formatMoney(summary.peakWeekDay.total, currency)})
            </Text>
          </View>
        ) : null}

        {trendMode === '7d' ? (
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
                            ? COLORS.primary
                            : day.total > 0
                              ? '#8CC2AD'
                              : '#E6ECEF',
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
                          ? COLORS.primary
                          : month.total > 0
                            ? '#7FAFD9'
                            : '#E6ECEF',
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
          <View style={styles.categoryStack} accessibilityLabel="Monthly spending share by category">
            {summary.categoryTotals.map((item, index) => (
              <View
                key={item.category}
                style={{
                  width: `${(item.total / summary.monthTotal) * 100}%`,
                  height: 11,
                  backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                }}
              />
            ))}
          </View>
          {visibleCategories.map((item, index) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryNameRow}>
                <View style={styles.categoryLabelWrap}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length] },
                    ]}
                  />
                  <View>
                    <View style={styles.categoryTitleLine}>
                      <Text style={styles.categoryName}>{item.category}</Text>
                      <Text style={styles.categoryCount}>{item.count}</Text>
                    </View>
                    {item.topSubcategory ? (
                      <Text style={styles.categorySub}>Top: {item.topSubcategory}</Text>
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
            </View>
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
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
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

      {summary.memberTotals.length > 0 && summary.monthTotal > 0 ? (
        <>
          <SectionHeading title="Family split (this month)" action="Manage" onAction={onOpenFamily} />
          <View style={styles.categoryCard}>
            {summary.memberTotals.length > 1 ? (
              <Text style={styles.equalShareNote}>
                Equal share across {summary.memberTotals.length} members:{' '}
                {formatMoney(summary.equalMemberShare, currency)} each
              </Text>
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
        <Pressable style={styles.modalBackdrop} onPress={() => setBudgetModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Monthly family budget</Text>
            <Text style={styles.modalHint}>
              Set a monthly target ({CURRENCY_SYMBOLS[currency]}) to see remaining balance and safe daily pace.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={budgetInput}
              onChangeText={(value) => setBudgetInput(sanitizeQuantityInput(value))}
              placeholder="e.g. 25000"
              placeholderTextColor="#9AA6B2"
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
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  greeting: { color: COLORS.ink, fontSize: 23, fontWeight: '800' },
  greetingSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  familyBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

  summaryCard: {
    backgroundColor: COLORS.primary,
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
  summaryLabel: { color: '#D5EAE1', fontWeight: '700', fontSize: 11, letterSpacing: 0.6 },
  momBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  momBadgeGood: { backgroundColor: '#164E3F' },
  momBadgeWarn: { backgroundColor: '#694613' },
  momBadgeText: { fontSize: 11, fontWeight: '800' },
  momTextGood: { color: '#A5F0D2' },
  momTextWarn: { color: '#FFE1A8' },
  momBadgeNeutral: {
    backgroundColor: '#ffffff1c',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  momBadgeTextNeutral: { color: '#E2F2EB', fontSize: 11, fontWeight: '700' },
  summaryAmount: { color: COLORS.white, fontSize: 34, fontWeight: '800', marginTop: 8 },
  heroStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#195747',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  heroStatCell: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: '#ffffff24' },
  heroStatLabel: { color: '#BFE0D2', fontSize: 10, fontWeight: '600' },
  heroStatValue: { color: COLORS.white, fontSize: 13, fontWeight: '800', marginTop: 3 },

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
  budgetLabel: { color: '#E3F3EC', fontSize: 12, fontWeight: '700' },
  budgetEditButton: {
    backgroundColor: '#ffffff22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  budgetEditText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  budgetTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#15473A',
    overflow: 'hidden',
  },
  budgetFill: { height: 8, borderRadius: 5 },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
    gap: 8,
  },
  budgetDetail: { color: '#D5EAE1', fontSize: 11, fontWeight: '600' },
  budgetPrompt: {
    marginTop: 14,
    backgroundColor: '#195747',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetPromptLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  budgetPromptText: { color: '#D5EAE1', fontSize: 11, flex: 1 },
  budgetPromptAction: { color: '#A5F0D2', fontSize: 11, fontWeight: '800' },

  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 11,
    alignItems: 'center',
    gap: 6,
  },
  quickActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconPrimary: {
    backgroundColor: '#ffffff24',
  },
  quickActionLabel: { color: COLORS.ink, fontSize: 11, fontWeight: '700' },
  quickActionLabelPrimary: { color: COLORS.white, fontWeight: '800' },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  kpiCard: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#F3F6F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kpiValue: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  kpiLabel: { color: COLORS.muted, fontSize: 11, marginTop: 3 },

  insightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  insightRowLast: { borderBottomWidth: 0 },
  insightDot: { width: 8, height: 8, borderRadius: 4 },
  insightText: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 18, fontWeight: '500' },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  chartTotal: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  chartCaption: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F7',
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  segmentButtonActive: { backgroundColor: COLORS.white },
  segmentText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  segmentTextActive: { color: COLORS.primary, fontWeight: '800' },
  peakBanner: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
  },
  peakBannerText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 },
  weekColumn: { flex: 1, alignItems: 'center', minWidth: 0 },
  weekAmount: { color: COLORS.muted, fontSize: 8, height: 12, textAlign: 'center', width: '100%' },
  weekBarTrack: { height: 80, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  weekBar: { width: '100%', minHeight: 3, borderRadius: 6 },
  weekDay: { color: COLORS.muted, fontSize: 10, marginTop: 7 },
  weekDayToday: { color: COLORS.primary, fontWeight: '800' },

  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryStack: { flexDirection: 'row', height: 11, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  categoryRow: { marginVertical: 10 },
  categoryNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 8 },
  categoryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  categoryDot: { width: 9, height: 9, borderRadius: 5 },
  categoryTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryCount: {
    color: COLORS.muted,
    fontSize: 10,
    backgroundColor: '#F1F4F7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 7,
  },
  categoryName: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  categorySub: { color: COLORS.muted, fontSize: 11, marginTop: 1 },
  categoryValue: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#EEF2F5', overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 5, backgroundColor: '#58A78C' },

  topPurchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topPurchaseLast: { borderBottomWidth: 0 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  topPurchaseTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  topPurchaseMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  topPurchaseAmount: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },

  equalShareNote: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },

  emptyCard: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 15, marginBottom: 6 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  privacyNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 22 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#14203377',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  modalHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  modalInput: {
    minHeight: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  modalClearButton: { paddingVertical: 10, paddingHorizontal: 10 },
  modalClearText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
  modalCancelText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalSaveText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
});
