import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CurrencyCode, Expense } from '../models';
import { displayDate, formatMoney } from '../models';
import { COLORS } from '../theme';

export function ExpenseRow({
  expense,
  memberName,
  currency,
  onPress,
  onDelete,
  last,
}: {
  expense: Expense;
  memberName: string;
  currency: CurrencyCode;
  onPress?: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  last: boolean;
}) {
  const hasNotes = expense.notes.trim().length > 0;

  return (
    <Pressable
      style={[styles.expenseRow, last && styles.noBorder]}
      onPress={onPress ? () => onPress(expense) : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${expense.title}, ${formatMoney(expense.amount, currency)}`}
    >
      <View style={styles.expenseIcon}>
        <Text style={styles.expenseIconText}>{expense.category.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.expenseDescription}>
        <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.expenseMeta}>
          {expense.quantity} {expense.unit} · {expense.category} · {expense.subcategory} · {memberName} · {displayDate(expense.date)}
        </Text>
        {hasNotes ? (
          <Text style={styles.expenseNotes} numberOfLines={1}>
            Note: {expense.notes.trim()}
          </Text>
        ) : null}
      </View>
      <View style={styles.expenseAmountWrap}>
        <Text style={styles.expenseAmount}>{formatMoney(expense.amount, currency)}</Text>
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            onDelete(expense);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${expense.title}`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 78,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 11,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  expenseIconText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  expenseDescription: {
    flex: 1,
    marginRight: 6,
  },
  expenseTitle: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  expenseMeta: {
    color: COLORS.muted,
    fontSize: 10,
  },
  expenseNotes: {
    color: COLORS.primary,
    fontSize: 11,
    marginTop: 4,
  },
  expenseAmountWrap: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  expenseAmount: {
    color: COLORS.ink,
    fontWeight: '800',
    fontSize: 12,
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
