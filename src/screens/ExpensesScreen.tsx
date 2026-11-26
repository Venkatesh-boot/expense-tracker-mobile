import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Expense, FamilyMember, Preferences } from '../models';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { ChoiceChip } from '../components/ChoiceChip';
import { ExpenseRow } from '../components/ExpenseRow';

type ExpensesScreenProps = {
  expenses: Expense[];
  members: FamilyMember[];
  preferences: Preferences;
  onSelectExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

const ALL_MEMBERS = '__all__';

export function ExpensesScreen({
  expenses,
  members,
  preferences,
  onSelectExpense,
  onDeleteExpense,
}: ExpensesScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(ALL_MEMBERS);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (selectedMemberId !== ALL_MEMBERS && expense.paidBy !== selectedMemberId) {
        return false;
      }
      if (!search) return true;
      const payer = memberNames.get(expense.paidBy) || '';
      return `${expense.title} ${expense.category} ${expense.subcategory} ${expense.notes} ${payer}`
        .toLowerCase()
        .includes(search);
    });
  }, [expenses, memberNames, query, selectedMemberId]);

  const header = (
    <View>
      <Text style={styles.eyebrow}>YOUR RECORDS</Text>
      <Text style={styles.pageTitle}>All expenses</Text>
      <Text style={styles.pageSubtitle}>
        {filtered.length === expenses.length
          ? `${expenses.length} saved on this device`
          : `Showing ${filtered.length} of ${expenses.length} expenses`}
      </Text>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Search expenses, categories, notes, or people"
        placeholderTextColor={colors.placeholder}
        accessibilityLabel="Search expenses"
      />
      {members.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          <ChoiceChip
            label="Everyone"
            selected={selectedMemberId === ALL_MEMBERS}
            onPress={() => setSelectedMemberId(ALL_MEMBERS)}
          />
          {members.map((member) => (
            <ChoiceChip
              key={member.id}
              label={member.name}
              selected={selectedMemberId === member.id}
              onPress={() => setSelectedMemberId(member.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {expenses.length === 0 ? 'Nothing recorded yet' : 'No matches'}
          </Text>
          <Text style={styles.emptyText}>
            {expenses.length === 0
              ? 'Add your first family expense to get started.'
              : 'Try a different search term or member filter.'}
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.rowShell,
            index === 0 && styles.rowFirst,
            index === filtered.length - 1 && styles.rowLast,
          ]}
        >
          <ExpenseRow
            expense={item}
            memberName={memberNames.get(item.paidBy) || 'Family'}
            currency={preferences.currency}
            onPress={onSelectExpense}
            onDelete={onDeleteExpense}
            last={index === filtered.length - 1}
          />
        </View>
      )}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    pageTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    pageSubtitle: { color: colors.muted, fontSize: 13, marginBottom: 18 },
    searchInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      minHeight: 48,
      paddingHorizontal: 14,
      color: colors.ink,
      marginBottom: 12,
    },
    filterChips: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 14,
    },
    rowShell: {
      backgroundColor: colors.surface,
      paddingHorizontal: 15,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    rowFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingTop: 4,
    },
    rowLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      paddingBottom: 4,
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
  });
