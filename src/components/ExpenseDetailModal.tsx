import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CurrencyCode, Expense } from '../models';
import { displayDate, formatMoney } from '../models';
import { COLORS } from '../theme';
import { AppIcon } from './AppIcon';

export function ExpenseDetailModal({
  expense,
  memberName,
  currency,
  onClose,
  onEdit,
  onDelete,
}: {
  expense: Expense | null;
  memberName: string;
  currency: CurrencyCode;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  if (!expense) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.header}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{expense.category}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close details">
              <AppIcon name="close" color={COLORS.muted} size={18} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{expense.title}</Text>
            <Text style={styles.amount}>{formatMoney(expense.amount, currency)}</Text>

            <View style={styles.detailsGrid}>
              <DetailItem label="Quantity" value={`${expense.quantity} ${expense.unit}`} />
              <DetailItem label="Date" value={displayDate(expense.date)} />
              <DetailItem label="Subcategory" value={expense.subcategory} />
              <DetailItem label="Paid by" value={memberName} />
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
              <AppIcon name="trash" color={COLORS.danger} size={15} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
            <Pressable
              style={styles.editButton}
              onPress={() => onEdit(expense)}
              accessibilityRole="button"
            >
              <AppIcon name="edit" color={COLORS.white} size={15} />
              <Text style={styles.editButtonText}>Edit expense</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#14203377',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryPillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    flexGrow: 0,
  },
  title: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  amount: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 11,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  detailValue: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 14,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
  },
  notesLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  notesValue: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  notesEmpty: {
    color: COLORS.muted,
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
    borderColor: '#E9C6C6',
    backgroundColor: '#FDF4F4',
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: COLORS.danger,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  editButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
