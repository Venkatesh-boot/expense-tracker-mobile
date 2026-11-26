import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Expense, FamilyMember, Preferences } from '../models';
import { CATEGORIES, formatMoney, getCurrencyLocale, todayString } from '../models';
import { COLORS } from '../theme';
import { AppIcon } from '../components/AppIcon';
import { ExpenseRow } from '../components/ExpenseRow';
import { SectionHeading } from '../components/SectionHeading';
import { DASHBOARD_CHART_COLORS } from './types';

type DashboardScreenProps = {
  expenses: Expense[];
  members: FamilyMember[];
  preferences: Preferences;
  onAddExpense: () => void;
  onShowExpenses: () => void;
  onSelectExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

export function DashboardScreen({
  expenses,
  members,
  preferences,
  onAddExpense,
  onShowExpenses,
  onSelectExpense,
  onDeleteExpense,
}: DashboardScreenProps) {
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const summary = useMemo(() => {
    const today = new Date();
    const todayKey = todayString(today);
    const monthPrefix = todayKey.slice(0, 7);
    const thisMonth = expenses.filter((expense) => expense.date.startsWith(monthPrefix));
    const total = thisMonth.reduce((sum, expense) => sum + expense.amount, 0);
    const monthAverage = total / Math.max(1, today.getDate());

    const categoryTotals = CATEGORIES.map((category) => {
      const items = thisMonth.filter((expense) => expense.category === category);
      return {
        category,
        count: items.length,
        total: items.reduce((sum, expense) => sum + expense.amount, 0),
      };
    })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const memberBuckets = new Map<string, { id: string; name: string; count: number; total: number }>();
    for (const expense of thisMonth) {
      const existing = memberBuckets.get(expense.paidBy);
      if (existing) {
        existing.count += 1;
        existing.total += expense.amount;
      } else {
        memberBuckets.set(expense.paidBy, {
          id: expense.paidBy,
          name: memberNames.get(expense.paidBy) || 'Family',
          count: 1,
          total: expense.amount,
        });
      }
    }
    const memberTotals = [...memberBuckets.values()].sort((a, b) => b.total - a.total);

    const locale = getCurrencyLocale(preferences.currency);
    const weekSpending = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
      const date = todayString(day);
      return {
        date,
        label: day.toLocaleDateString(locale, { weekday: 'short' }),
        total: expenses
          .filter((expense) => expense.date === date)
          .reduce((sum, expense) => sum + expense.amount, 0),
      };
    });

    return {
      todayKey,
      thisMonth,
      total,
      monthAverage,
      categoryTotals,
      maxCategory: Math.max(1, ...categoryTotals.map((item) => item.total)),
      memberTotals,
      maxMember: Math.max(1, ...memberTotals.map((item) => item.total)),
      weekSpending,
      weekTotal: weekSpending.reduce((sum, day) => sum + day.total, 0),
      maxDay: Math.max(1, ...weekSpending.map((day) => day.total)),
      recent: expenses.slice(0, 4),
      monthLabel: today.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    };
  }, [expenses, memberNames, preferences.currency]);

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
          <Text style={styles.greeting}>Hello, {preferences.displayName}</Text>
        </View>
        <View style={styles.familyBadge}>
          <Text style={styles.familyBadgeText}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOTAL SPENT · {summary.monthLabel.toUpperCase()}</Text>
        <Text style={styles.summaryAmount}>{formatMoney(summary.total, preferences.currency)}</Text>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBottom}>
          <Text style={styles.summaryDetail}>
            {summary.thisMonth.length} {summary.thisMonth.length === 1 ? 'expense recorded' : 'expenses recorded'}
          </Text>
          <Text style={styles.summaryDetail}>
            {summary.categoryTotals.length} {summary.categoryTotals.length === 1 ? 'category' : 'categories'}
          </Text>
        </View>
        <View style={styles.summaryDecorOne} />
        <View style={styles.summaryDecorTwo} />
      </View>

      <View style={styles.dashboardMetrics}>
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <AppIcon name="trend" color={COLORS.primary} size={18} />
          </View>
          <Text style={styles.metricValue}>{formatMoney(summary.monthAverage, preferences.currency)}</Text>
          <Text style={styles.metricLabel}>Daily average</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <AppIcon name="chart" color={COLORS.amber} size={18} />
          </View>
          <Text style={styles.metricValue}>{summary.thisMonth.length}</Text>
          <Text style={styles.metricLabel}>Transactions</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={onAddExpense} accessibilityRole="button">
        <View style={styles.primaryButtonInner}>
          <AppIcon name="add" color={COLORS.white} size={17} />
          <Text style={styles.primaryButtonText}>Add an expense</Text>
        </View>
      </Pressable>

      <SectionHeading title="Last 7 days" />
      <View style={styles.chartCard} accessibilityLabel="Spending by day for the last seven days">
        <View style={styles.chartSummary}>
          <View>
            <Text style={styles.chartTotal}>{formatMoney(summary.weekTotal, preferences.currency)}</Text>
            <Text style={styles.chartCaption}>spent in the past week</Text>
          </View>
          <Text style={styles.chartPeriod}>7 DAYS</Text>
        </View>
        <View style={styles.weekChart}>
          {summary.weekSpending.map((day) => (
            <View key={day.date} style={styles.weekColumn}>
              <Text style={styles.weekAmount} numberOfLines={1}>
                {day.total > 0 ? formatMoney(day.total, preferences.currency) : ''}
              </Text>
              <View style={styles.weekBarTrack}>
                <View
                  style={[
                    styles.weekBar,
                    {
                      height: day.total > 0 ? Math.max(8, (day.total / summary.maxDay) * 70) : 3,
                      backgroundColor: day.date === summary.todayKey ? COLORS.primary : '#9CCAB8',
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
      </View>

      <SectionHeading title="Spending by category" />
      {summary.categoryTotals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your month starts here</Text>
          <Text style={styles.emptyText}>Add an expense to see your family spending at a glance.</Text>
        </View>
      ) : (
        <View style={styles.categoryCard}>
          <View style={styles.categoryStack} accessibilityLabel="Monthly spending share by category">
            {summary.categoryTotals.map((item, index) => (
              <View
                key={item.category}
                style={{
                  width: `${(item.total / summary.total) * 100}%`,
                  height: 10,
                  backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                }}
              />
            ))}
          </View>
          {summary.categoryTotals.slice(0, 5).map((item, index) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryNameRow}>
                <View style={styles.categoryLabelWrap}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length] },
                    ]}
                  />
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <Text style={styles.categoryCount}>{item.count}</Text>
                </View>
                <Text style={styles.categoryValue}>
                  {formatMoney(item.total, preferences.currency)} · {Math.round((item.total / summary.total) * 100)}%
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

      {summary.memberTotals.length > 0 ? (
        <>
          <SectionHeading title="Paid by member (this month)" />
          <View style={styles.categoryCard}>
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
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryCount}>{item.count}</Text>
                  </View>
                  <Text style={styles.categoryValue}>
                    {formatMoney(item.total, preferences.currency)} · {Math.round((item.total / summary.total) * 100)}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(4, (item.total / summary.maxMember) * 100)}%`,
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
              currency={preferences.currency}
              onPress={onSelectExpense}
              onDelete={onDeleteExpense}
              last={index === summary.recent.length - 1}
            />
          ))}
        </View>
      )}
      <Text style={styles.privacyNote}>Offline by design · Your data stays on this device</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  greeting: { color: COLORS.ink, fontSize: 23, fontWeight: '800' },
  familyBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  familyBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  summaryCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 22, minHeight: 168, overflow: 'hidden', justifyContent: 'center' },
  summaryLabel: { color: '#D5EAE1', fontWeight: '600', fontSize: 13 },
  summaryAmount: { color: COLORS.white, fontSize: 34, fontWeight: '800', marginTop: 6 },
  summaryDivider: { height: 1, backgroundColor: '#ffffff35', marginTop: 18, marginBottom: 12 },
  summaryBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryDetail: { color: '#D5EAE1', fontSize: 12, fontWeight: '600' },
  summaryDecorOne: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#ffffff0d', right: -25, top: -50 },
  summaryDecorTwo: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#ffffff0d', right: 36, bottom: -55 },
  dashboardMetrics: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metricCard: { flex: 1, minHeight: 92, borderRadius: 17, backgroundColor: COLORS.white, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  metricIconWrap: { marginBottom: 7 },
  metricValue: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  metricLabel: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  primaryButton: { backgroundColor: COLORS.primary, minHeight: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingHorizontal: 16 },
  primaryButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  chartCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTotal: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  chartCaption: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  chartPeriod: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, backgroundColor: COLORS.primaryLight, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 },
  weekColumn: { flex: 1, alignItems: 'center', minWidth: 0 },
  weekAmount: { color: COLORS.muted, fontSize: 8, height: 12, textAlign: 'center', width: '100%' },
  weekBarTrack: { height: 74, width: '62%', justifyContent: 'flex-end', alignItems: 'center' },
  weekBar: { width: '100%', minHeight: 3, borderRadius: 6 },
  weekDay: { color: COLORS.muted, fontSize: 10, marginTop: 7 },
  weekDayToday: { color: COLORS.primary, fontWeight: '800' },
  categoryCard: { backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  categoryStack: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 7 },
  categoryRow: { marginVertical: 11 },
  categoryNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryCount: { color: COLORS.muted, fontSize: 10, backgroundColor: '#F1F4F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7 },
  categoryName: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  categoryValue: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#EEF2F5', overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 5, backgroundColor: '#58A78C' },
  emptyCard: { padding: 20, backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 15, marginBottom: 6 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  privacyNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 22 },
});
