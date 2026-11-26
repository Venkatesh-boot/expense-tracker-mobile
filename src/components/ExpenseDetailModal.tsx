import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CurrencyCode, Expense } from '../models';
import { displayDate, formatMoney } from '../models';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from './AppIcon';
import type { AppIconName } from './AppIcon';
import { getCategoryIcon, getSubcategoryIcon } from './categoryIcons';

export function ExpenseDetailModal({
  expense,
  memberName,
  currency,
  onClose,
  onEdit,
  onDelete,
  onViewPriceHistory,
}: {
  expense: Expense | null;
  memberName: string;
  currency: CurrencyCode;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onViewPriceHistory?: (expense: Expense) => void;
}) {
  const { colors, categoryColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!expense) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: categoryColors[expense.category]?.bg ?? colors.primaryLight },
              ]}
            >
              <AppIcon
                name={getCategoryIcon(expense.category)}
                color={categoryColors[expense.category]?.fg ?? colors.primary}
                size={13}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  { color: categoryColors[expense.category]?.fg ?? colors.primary },
                ]}
              >
                {expense.category}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close details">
              <AppIcon name="close" color={colors.muted} size={18} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{expense.title}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>{formatMoney(expense.amount, currency)}</Text>
              {onViewPriceHistory ? (
                <Pressable
                  style={styles.priceHistoryPill}
                  onPress={() => onViewPriceHistory(expense)}
                  accessibilityRole="button"
                >
                  <AppIcon name="trend" color={colors.primary} size={13} />
                  <Text style={styles.priceHistoryText}>Price history</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.detailsGrid}>
              <DetailItem label="Quantity" value={`${expense.quantity} ${expense.unit}`} styles={styles} />
              <DetailItem label="Date" value={displayDate(expense.date)} styles={styles} />
              <DetailItem
                label="Subcategory"
                value={expense.subcategory}
                icon={getSubcategoryIcon(expense.subcategory, expense.category)}
                iconColor={colors.primary}
                styles={styles}
              />
              <DetailItem label="Paid by" value={memberName} styles={styles} />
            </View>

            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={expense.notes.trim() ? styles.notesValue : styles.notesEmpty}>
                {expense.notes.trim() || 'No notes added.'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={styles.deleteButton}
              onPress={() => onDelete(expense)}
              accessibilityRole="button"
            >
              <AppIcon name="trash" color={colors.danger} size={15} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
            <Pressable
              style={styles.editButton}
              onPress={() => onEdit(expense)}
              accessibilityRole="button"
            >
              <AppIcon name="edit" color={colors.onPrimary} size={15} />
              <Text style={styles.editButtonText}>Edit expense</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailItem({
  label,
  value,
  icon,
  iconColor,
  styles,
}: {
  label: string;
  value: string;
  icon?: AppIconName;
  iconColor?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueRow}>
        {icon && iconColor ? <AppIcon name={icon} color={iconColor} size={13} /> : null}
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      maxHeight: '82%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    categoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    categoryPillText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    body: {
      flexGrow: 0,
    },
    title: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 6,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 16,
    },
    amount: {
      color: colors.primary,
      fontSize: 26,
      fontWeight: '900',
    },
    priceHistoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      borderRadius: 11,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    priceHistoryText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    detailItem: {
      width: '47%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 11,
    },
    detailLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 3,
    },
    detailValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailValue: {
      flex: 1,
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
    },
    notesBox: {
      marginTop: 14,
      backgroundColor: colors.background,
      borderRadius: 14,
      padding: 12,
    },
    notesLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    notesValue: {
      color: colors.ink,
      fontSize: 13,
      lineHeight: 19,
    },
    notesEmpty: {
      color: colors.muted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 46,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerLight,
      paddingHorizontal: 16,
    },
    deleteButtonText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: 46,
      borderRadius: 13,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
    },
    editButtonText: {
      color: colors.onPrimary,
      fontWeight: '800',
      fontSize: 13,
    },
  });
