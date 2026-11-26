import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Expense, ExpenseCategory, FamilyMember, Preferences } from '../models';
import {
  buildUnitOptions,
  CATEGORIES,
  createId,
  sanitizeQuantityInput,
  SUBCATEGORIES,
  todayString,
} from '../models';
import type { ReceiptScanResult } from '../receipt';
import { DatePickerField, Dropdown, parseDate } from '../controls';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { AppIcon } from '../components/AppIcon';
import { ChoiceChip } from '../components/ChoiceChip';

type ReceiptDraftItem = {
  id: string;
  title: string;
  amount: string;
  quantityText: string;
  unit: string;
  category: ExpenseCategory;
  subcategory: string;
};

type AddExpenseProps = {
  members: FamilyMember[];
  preferences: Preferences;
  editingExpense?: Expense | null;
  onCancel: () => void;
  onSave: (expenses: Omit<Expense, 'id'>[]) => Promise<void>;
  onUpdate: (expense: Expense) => Promise<void>;
  onScanReceipt: (source: 'camera' | 'library' | 'pdf') => Promise<ReceiptScanResult | null>;
};

export function AddExpenseScreen({
  members,
  preferences,
  editingExpense,
  onCancel,
  onSave,
  onUpdate,
  onScanReceipt,
}: AddExpenseProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isEditing = Boolean(editingExpense);
  const [title, setTitle] = useState(editingExpense?.title ?? '');
  const [amount, setAmount] = useState(editingExpense ? editingExpense.amount.toFixed(2) : '');
  const [quantity, setQuantity] = useState(editingExpense ? String(editingExpense.quantity) : '1');
  const [unit, setUnit] = useState(editingExpense?.unit ?? 'pc');
  const [category, setCategory] = useState<ExpenseCategory>(editingExpense?.category ?? 'Other');
  const [subcategory, setSubcategory] = useState<string>(
    editingExpense?.subcategory ?? SUBCATEGORIES.Other[0]
  );
  const [date, setDate] = useState(editingExpense?.date ?? todayString());
  const [paidBy, setPaidBy] = useState(
    editingExpense?.paidBy ?? (preferences.selfId || members[0]?.id || '')
  );
  const [notes, setNotes] = useState(editingExpense?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptDraftItem[] | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toFixed(2));
      setQuantity(String(editingExpense.quantity));
      setUnit(editingExpense.unit);
      setCategory(editingExpense.category);
      setSubcategory(editingExpense.subcategory);
      setDate(editingExpense.date);
      setPaidBy(editingExpense.paidBy);
      setNotes(editingExpense.notes);
      setReceiptItems(null);
      setScanFeedback(null);
    } else {
      setTitle('');
      setAmount('');
      setQuantity('1');
      setUnit('pc');
      setCategory('Other');
      setSubcategory(SUBCATEGORIES.Other[0]);
      setDate(todayString());
      setPaidBy(preferences.selfId || members[0]?.id || '');
      setNotes('');
      setReceiptItems(null);
      setScanFeedback(null);
    }
  }, [editingExpense, members, preferences.selfId]);

  const subcategoryOptions = SUBCATEGORIES[category].map((value) => ({
    label: value,
    value,
  }));
  const selectCategory = (value: ExpenseCategory) => {
    setCategory(value);
    setSubcategory(SUBCATEGORIES[value][0]);
  };

  const applyScan = async (source: 'camera' | 'library' | 'pdf') => {
    setScanning(true);
    setScanFeedback(null);
    try {
      const result = await onScanReceipt(source);
      if (result) {
        const suggestion = result.suggestions[0];
        if (result.itemized) {
          setReceiptItems(
            result.suggestions.map((item) => ({
              id: createId(),
              title: item.title,
              amount: item.amount,
              quantityText: String(item.quantity),
              unit: item.unit,
              category: item.category,
              subcategory:
                item.category === 'Groceries' ? 'Pantry' : SUBCATEGORIES[item.category][0],
            }))
          );
        } else {
          setReceiptItems(null);
          if (suggestion.title) setTitle(suggestion.title);
          if (suggestion.amount) setAmount(suggestion.amount);
          setQuantity(String(suggestion.quantity));
          setUnit(suggestion.unit);
          selectCategory(suggestion.category);
        }
        if (suggestion.date) setDate(suggestion.date);
        setScanFeedback({
          message: result.itemized
            ? `Found ${result.suggestions.length} bill items. Review each item below before saving.`
            : 'Receipt details suggested. Review them below before saving.',
          isError: false,
        });
      }
    } catch (error) {
      setScanFeedback({
        message:
          error instanceof Error
            ? error.message
            : 'Could not scan the receipt. Please try again or enter the details manually.',
        isError: true,
      });
    } finally {
      setScanning(false);
    }
  };

  const updateReceiptItem = (
    id: string,
    updater: (item: ReceiptDraftItem) => ReceiptDraftItem
  ) => {
    setReceiptItems((current) =>
      current ? current.map((row) => (row.id === id ? updater(row) : row)) : null
    );
  };

  const removeReceiptItem = (id: string) => {
    setReceiptItems((current) => {
      if (!current) return null;
      const next = current.filter((row) => row.id !== id);
      return next.length > 0 ? next : null;
    });
  };

  const save = async () => {
    if (parseDate(date) === null) {
      Alert.alert('Check the date', 'Use a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!paidBy) {
      Alert.alert('Add a family member', 'Add a family member before recording an expense.');
      return;
    }

    const expenses = receiptItems
      ? receiptItems.map((item) => ({
          title: item.title.trim(),
          amount: Number(item.amount.replace(/,/g, '')),
          quantity: Number(item.quantityText),
          unit: item.unit.trim(),
          category: item.category,
          subcategory: item.subcategory,
        }))
      : [
          {
            title: title.trim(),
            amount: Number(amount.replace(/,/g, '')),
            quantity: Number(quantity),
            unit: unit.trim(),
            category,
            subcategory,
          },
        ];

    if (expenses.some((expense) => !expense.title)) {
      Alert.alert('Add a description', 'Enter a description for each bill item.');
      return;
    }
    if (
      expenses.some(
        (expense) =>
          !Number.isFinite(expense.amount) ||
          expense.amount <= 0 ||
          expense.amount > 100_000_000
      )
    ) {
      Alert.alert('Check the amounts', 'Each bill item needs an amount greater than zero.');
      return;
    }
    if (
      expenses.some(
        (expense) =>
          !Number.isFinite(expense.quantity) ||
          expense.quantity <= 0 ||
          expense.quantity > 1_000_000 ||
          !expense.unit ||
          expense.unit.length > 24
      )
    ) {
      Alert.alert(
        'Check quantity and unit',
        'Enter a positive quantity and select a unit for each expense.'
      );
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        const updated = expenses[0];
        await onUpdate({
          ...editingExpense,
          ...updated,
          date,
          paidBy,
          notes: notes.trim(),
        });
      } else {
        await onSave(
          expenses.map((expense) => ({
            ...expense,
            date,
            paidBy,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
          }))
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not save expense',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <Pressable
            onPress={onCancel}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="back" color={colors.ink} size={18} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>FAMILY WALLET</Text>
            <Text style={styles.pageTitle}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>
          </View>
        </View>

        {!isEditing ? (
          <View style={styles.scanCard}>
            <View style={styles.scanCopy}>
              <Text style={styles.scanTitle}>Add from a receipt</Text>
              <Text style={styles.scanText}>
                {Platform.OS === 'web'
                  ? 'PDFs with selectable text can create separate editable expenses for each detected bill item.'
                  : 'Photos and PDFs with item tables can create separate expenses for each item, or suggest a single total.'}
              </Text>
            </View>
            {scanning ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.scanButtons}>
                {Platform.OS !== 'web' ? (
                  <>
                    <Pressable style={styles.scanButton} onPress={() => void applyScan('camera')}>
                      <Text style={styles.scanButtonText}>Camera</Text>
                    </Pressable>
                    <Pressable style={styles.scanButton} onPress={() => void applyScan('library')}>
                      <Text style={styles.scanButtonText}>Photo</Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable style={styles.scanButton} onPress={() => void applyScan('pdf')}>
                  <Text style={styles.scanButtonText}>PDF</Text>
                </Pressable>
              </View>
            )}
            {scanning ? <Text style={styles.scanFeedback}>Reading receipt…</Text> : null}
            {scanFeedback ? (
              <Text
                style={[styles.scanFeedback, scanFeedback.isError && styles.scanError]}
                accessibilityRole={scanFeedback.isError ? 'alert' : undefined}
              >
                {scanFeedback.message}
              </Text>
            ) : null}
          </View>
        ) : null}

        {receiptItems ? (
          <View style={styles.receiptItems}>
            <View style={styles.receiptItemsHeader}>
              <View style={styles.flex}>
                <Text style={styles.inputLabel}>Items from bill ({receiptItems.length})</Text>
                <Text style={styles.receiptItemsHint}>
                  Each item will be saved as a separate expense with its own category.
                </Text>
              </View>
              <Pressable
                style={styles.clearItemsButton}
                onPress={() => {
                  setReceiptItems(null);
                  setScanFeedback(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearItemsText}>Manual entry</Text>
              </Pressable>
            </View>

            {receiptItems.map((item, index) => (
              <View key={item.id} style={styles.receiptItemCard}>
                <View style={styles.receiptItemTop}>
                  <TextInput
                    style={[styles.input, styles.receiptItemTitle]}
                    value={item.title}
                    onChangeText={(value) =>
                      updateReceiptItem(item.id, (row) => ({ ...row, title: value }))
                    }
                    placeholder="Item description"
                    placeholderTextColor={colors.placeholder}
                    maxLength={160}
                    accessibilityLabel={`Bill item ${index + 1} description`}
                  />
                  <Pressable
                    style={styles.removeItemButton}
                    onPress={() => removeReceiptItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove bill item ${index + 1}`}
                  >
                    <AppIcon name="trash" color={colors.danger} size={15} />
                  </Pressable>
                </View>

                <View style={styles.receiptItemRow}>
                  <TextInput
                    style={[styles.input, styles.receiptItemQuantity]}
                    value={item.quantityText}
                    onChangeText={(value) =>
                      updateReceiptItem(item.id, (row) => ({
                        ...row,
                        quantityText: sanitizeQuantityInput(value),
                      }))
                    }
                    placeholder="Qty"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    accessibilityLabel={`Bill item ${index + 1} quantity`}
                  />
                  <View style={styles.receiptItemUnit}>
                    <Dropdown
                      label=""
                      inline
                      modalTitle={`Bill item ${index + 1} unit`}
                      value={item.unit}
                      options={buildUnitOptions(item.unit)}
                      onChange={(value) =>
                        updateReceiptItem(item.id, (row) => ({ ...row, unit: value }))
                      }
                      placeholder="Unit"
                    />
                  </View>
                  <TextInput
                    style={[styles.input, styles.receiptItemAmount]}
                    value={item.amount}
                    onChangeText={(value) =>
                      updateReceiptItem(item.id, (row) => ({ ...row, amount: value }))
                    }
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Bill item ${index + 1} amount`}
                  />
                </View>

                <View style={styles.receiptItemCategoryRow}>
                  <View style={styles.flex}>
                    <Dropdown
                      label=""
                      compact
                      value={item.category}
                      options={CATEGORIES.map((value) => ({ label: value, value }))}
                      onChange={(nextCategory) =>
                        updateReceiptItem(item.id, (row) => ({
                          ...row,
                          category: nextCategory,
                          subcategory: SUBCATEGORIES[nextCategory][0],
                        }))
                      }
                    />
                  </View>
                  <View style={styles.flex}>
                    <Dropdown
                      label=""
                      compact
                      value={item.subcategory}
                      options={SUBCATEGORIES[item.category].map((value) => ({
                        label: value,
                        value,
                      }))}
                      onChange={(nextSubcategory) =>
                        updateReceiptItem(item.id, (row) => ({
                          ...row,
                          subcategory: nextSubcategory,
                        }))
                      }
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            <Text style={styles.inputLabel}>Product / description</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekly groceries or milk"
              placeholderTextColor={colors.placeholder}
              maxLength={160}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Amount ({preferences.currency})</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              accessibilityLabel="Expense amount"
            />

            <Text style={styles.inputLabel}>Quantity and unit</Text>
            <View style={styles.manualQuantityRow}>
              <TextInput
                style={[styles.input, styles.manualQuantityInput]}
                value={quantity}
                onChangeText={(value) => setQuantity(sanitizeQuantityInput(value))}
                placeholder="Quantity"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                inputMode="decimal"
                accessibilityLabel="Expense quantity"
              />
              <View style={styles.flex}>
                <Dropdown
                  label=""
                  inline
                  modalTitle="Unit"
                  value={unit}
                  options={buildUnitOptions(unit)}
                  onChange={setUnit}
                  placeholder="Unit"
                />
              </View>
            </View>

            <Dropdown
              label="Category"
              value={category}
              options={CATEGORIES.map((value) => ({ label: value, value }))}
              onChange={selectCategory}
            />
            <Dropdown
              label="Subcategory"
              value={subcategory}
              options={subcategoryOptions}
              onChange={setSubcategory}
            />
          </>
        )}

        <DatePickerField label="Expense date" value={date} onChange={setDate} />

        <Text style={styles.inputLabel}>Paid by</Text>
        <View style={styles.chipWrap}>
          {members.map((member) => (
            <ChoiceChip
              key={member.id}
              label={member.name}
              selected={paidBy === member.id}
              onPress={() => setPaidBy(member.id)}
            />
          ))}
        </View>

        <Text style={styles.inputLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else to remember?"
          placeholderTextColor={colors.placeholder}
          maxLength={500}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={() => void save()}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : receiptItems
                  ? `Save ${receiptItems.length} ${receiptItems.length === 1 ? 'expense' : 'expenses'}`
                  : 'Save expense'}
          </Text>
        </Pressable>
        <Pressable style={styles.cancelAction} onPress={onCancel}>
          <Text style={styles.cancelActionText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
    formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    pageTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    scanCard: { backgroundColor: colors.primaryLight, borderRadius: 18, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: colors.primaryBorder },
    scanCopy: { marginBottom: 12 },
    scanTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    scanText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    scanButtons: { flexDirection: 'row', gap: 8 },
    scanButton: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryBorder },
    scanButtonText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    scanFeedback: { color: colors.primary, fontSize: 12, lineHeight: 17, marginTop: 10 },
    scanError: { color: colors.danger },
    receiptItems: { marginBottom: 8 },
    receiptItemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
    receiptItemsHint: { color: colors.muted, fontSize: 12 },
    clearItemsButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    clearItemsText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    receiptItemCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 15,
      padding: 10,
      marginBottom: 10,
      gap: 8,
    },
    receiptItemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    receiptItemRow: { flexDirection: 'row', gap: 8 },
    receiptItemCategoryRow: { flexDirection: 'row', gap: 8 },
    receiptItemTitle: { flex: 1 },
    receiptItemQuantity: { width: 72, paddingHorizontal: 10 },
    receiptItemUnit: { width: 104 },
    receiptItemAmount: { flex: 1 },
    removeItemButton: {
      width: 42,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualQuantityRow: { flexDirection: 'row', gap: 8 },
    manualQuantityInput: { flex: 1 },
    inputLabel: { color: colors.ink, fontWeight: '700', fontSize: 12, marginBottom: 7, marginTop: 12 },
    input: {
      minHeight: 48,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 13,
      color: colors.ink,
      fontSize: 14,
    },
    notesInput: { minHeight: 82, paddingTop: 12 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    primaryButton: {
      backgroundColor: colors.primary,
      minHeight: 50,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
      paddingHorizontal: 16,
    },
    primaryButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
    disabledButton: { opacity: 0.6 },
    cancelAction: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    cancelActionText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  });
