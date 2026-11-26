import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CurrencyCode, Expense } from '../models';
import { displayDate, formatMoney } from '../models';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from './AppIcon';
import { getCategoryIcon, getSubcategoryIcon } from './categoryIcons';

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
  const { colors, categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasNotes = expense.notes.trim().length > 0;
  const badgeColor = categoryColors[expense.category] ?? {
    bg: colors.primaryLight,
    fg: colors.primary,
  };

  return (
    <View style={[styles.expenseRow, last && styles.noBorder]}>
      <Pressable
        style={styles.expenseMain}
        onPress={onPress ? () => onPress(expense) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${expense.title}, ${formatMoney(expense.amount, currency)}`}
      >
        <View style={[styles.expenseIcon, { backgroundColor: badgeColor.bg }]}>
          <AppIcon name={getCategoryIcon(expense.category)} color={badgeColor.fg} size={18} />
        </View>
        <View style={styles.expenseDescription}>
          <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
          <View style={styles.expenseMetaRow}>
            <AppIcon
              name={getSubcategoryIcon(expense.subcategory, expense.category)}
              color={colors.muted}
              size={11}
            />
            <Text style={styles.expenseMeta} numberOfLines={1}>
              {expense.quantity} {expense.unit} · {expense.category} · {expense.subcategory} · {memberName} · {displayDate(expense.date)}
            </Text>
          </View>
          {hasNotes ? (
            <Text style={styles.expenseNotes} numberOfLines={1}>
              Note: {expense.notes.trim()}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.expenseAmountWrap}>
        <Text style={styles.expenseAmount}>{formatMoney(expense.amount, currency)}</Text>
        <Pressable
          onPress={() => onDelete(expense)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${expense.title}`}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    expenseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 78,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 11,
    },
    expenseMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
    },
    noBorder: {
      borderBottomWidth: 0,
    },
    expenseIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    expenseIconText: {
      color: colors.primary,
      fontWeight: '800',
    },
    expenseDescription: {
      flex: 1,
      marginRight: 6,
    },
    expenseTitle: {
      color: colors.ink,
      fontWeight: '700',
      fontSize: 13,
      marginBottom: 4,
    },
    expenseMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    expenseMeta: {
      flex: 1,
      color: colors.muted,
      fontSize: 10,
    },
    expenseNotes: {
      color: colors.primary,
      fontSize: 11,
      marginTop: 4,
    },
    expenseAmountWrap: {
      alignItems: 'flex-end',
      minWidth: 72,
    },
    expenseAmount: {
      color: colors.ink,
      fontWeight: '800',
      fontSize: 12,
    },
    deleteText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '600',
      marginTop: 4,
    },
  });
