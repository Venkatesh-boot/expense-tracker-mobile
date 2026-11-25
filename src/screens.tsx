import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  CurrencyCode,
  Expense,
  ExpenseCategory,
  FamilyMember,
  Preferences,
} from './models';
import {
  CATEGORIES,
  CURRENCIES,
  SUBCATEGORIES,
  displayDate,
  formatMoney,
  todayString,
} from './models';
import type { ReceiptScanResult, ReceiptSuggestion } from './receipt';
import { DatePickerField, Dropdown, parseDate } from './controls';
import { COLORS } from './theme';

export { COLORS };

type ScreenProps = {
  expenses: Expense[];
  members: FamilyMember[];
  preferences: Preferences;
  onAddExpense: () => void;
  onShowExpenses: () => void;
  onDeleteExpense: (expense: Expense) => void;
};

export function DashboardScreen({
  expenses,
  members,
  preferences,
  onAddExpense,
  onShowExpenses,
  onDeleteExpense,
}: ScreenProps) {
  const monthPrefix = todayString().slice(0, 7);
  const thisMonth = expenses.filter((expense) => expense.date.startsWith(monthPrefix));
  const total = thisMonth.reduce((sum, expense) => sum + expense.amount, 0);
  const today = new Date();
  const monthAverage = total / today.getDate();
  const categoryTotals = CATEGORIES.map((category) => ({
    category,
    expenses: thisMonth.filter((expense) => expense.category === category),
    total: thisMonth.filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategory = Math.max(1, ...categoryTotals.map((item) => item.total));
  const weekSpending = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return {
      date,
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      total: expenses
        .filter((expense) => expense.date === date)
        .reduce((sum, expense) => sum + expense.amount, 0),
    };
  });
  const maxDay = Math.max(1, ...weekSpending.map((day) => day.total));
  const recent = expenses.slice(0, 4);
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.eyebrow}>YOUR FAMILY WALLET</Text>
          <Text style={styles.greeting}>Hello, {preferences.displayName}</Text>
        </View>
        <View style={styles.familyBadge}>
          <Text style={styles.familyBadgeText}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>TOTAL SPENT · {monthLabel.toUpperCase()}</Text>
        <Text style={styles.summaryAmount}>{formatMoney(total, preferences.currency)}</Text>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBottom}>
          <Text style={styles.summaryDetail}>{thisMonth.length} {thisMonth.length === 1 ? 'expense recorded' : 'expenses recorded'}</Text>
          <Text style={styles.summaryDetail}>{categoryTotals.length} {categoryTotals.length === 1 ? 'category' : 'categories'}</Text>
        </View>
        <View style={styles.summaryDecorOne} />
        <View style={styles.summaryDecorTwo} />
      </View>

      <View style={styles.dashboardMetrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>↗</Text>
          <Text style={styles.metricValue}>{formatMoney(monthAverage, preferences.currency)}</Text>
          <Text style={styles.metricLabel}>Daily average</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricIcon, styles.metricIconAmber]}>▤</Text>
          <Text style={styles.metricValue}>{thisMonth.length}</Text>
          <Text style={styles.metricLabel}>Transactions</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={onAddExpense} accessibilityRole="button">
        <Text style={styles.primaryButtonText}>＋  Add an expense</Text>
      </Pressable>

      <SectionHeading title="Last 7 days" />
      <View style={styles.chartCard} accessibilityLabel="Spending by day for the last seven days">
        <View style={styles.chartSummary}>
          <View>
            <Text style={styles.chartTotal}>
              {formatMoney(weekSpending.reduce((sum, day) => sum + day.total, 0), preferences.currency)}
            </Text>
            <Text style={styles.chartCaption}>spent in the past week</Text>
          </View>
          <Text style={styles.chartPeriod}>7 DAYS</Text>
        </View>
        <View style={styles.weekChart}>
          {weekSpending.map((day) => (
            <View key={day.date} style={styles.weekColumn}>
              <Text style={styles.weekAmount} numberOfLines={1}>
                {day.total > 0 ? formatMoney(day.total, preferences.currency) : ''}
              </Text>
              <View style={styles.weekBarTrack}>
                <View
                  style={[
                    styles.weekBar,
                    {
                      height: day.total > 0 ? Math.max(8, (day.total / maxDay) * 70) : 3,
                      backgroundColor: day.date === todayString() ? COLORS.primary : '#9CCAB8',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.weekDay, day.date === todayString() && styles.weekDayToday]}>
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <SectionHeading title="Spending by category" />
      {categoryTotals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your month starts here</Text>
          <Text style={styles.emptyText}>Add an expense to see your family spending at a glance.</Text>
        </View>
      ) : (
        <View style={styles.categoryCard}>
          <View style={styles.categoryStack} accessibilityLabel="Monthly spending share by category">
            {categoryTotals.map((item, index) => (
              <View
                key={item.category}
                style={{
                  width: `${(item.total / total) * 100}%`,
                  height: 10,
                  backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                }}
              />
            ))}
          </View>
          {categoryTotals.slice(0, 5).map((item, index) => (
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
                  <Text style={styles.categoryCount}>{item.expenses.length}</Text>
                </View>
                <Text style={styles.categoryValue}>
                  {formatMoney(item.total, preferences.currency)} · {Math.round((item.total / total) * 100)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(4, (item.total / maxCategory) * 100)}%`,
                      backgroundColor: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <SectionHeading title="Recent expenses" action="See all" onAction={onShowExpenses} />
      {recent.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No expenses yet. Your entries stay private on this device.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {recent.map((expense, index) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              memberName={members.find((member) => member.id === expense.paidBy)?.name || 'Family'}
              currency={preferences.currency}
              onDelete={onDeleteExpense}
              last={index === recent.length - 1}
            />
          ))}
        </View>
      )}
      <Text style={styles.privacyNote}>Offline by design · Your data stays on this device</Text>
    </ScrollView>
  );
}

type ExpensesScreenProps = Omit<ScreenProps, 'onAddExpense' | 'onShowExpenses'>;

export function ExpensesScreen({
  expenses,
  members,
  preferences,
  onDeleteExpense,
}: ExpensesScreenProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (!search) return true;
      const payer = members.find((member) => member.id === expense.paidBy)?.name || '';
      return `${expense.title} ${expense.category} ${expense.subcategory} ${payer}`.toLowerCase().includes(search);
    });
  }, [expenses, members, query]);

  return (
    <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR RECORDS</Text>
      <Text style={styles.pageTitle}>All expenses</Text>
      <Text style={styles.pageSubtitle}>{expenses.length} saved on this device</Text>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Search expenses, categories, or people"
        placeholderTextColor="#9AA6B2"
        accessibilityLabel="Search expenses"
      />
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{expenses.length === 0 ? 'Nothing recorded yet' : 'No matches'}</Text>
          <Text style={styles.emptyText}>
            {expenses.length === 0 ? 'Add your first family expense to get started.' : 'Try a different search term.'}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {filtered.map((expense, index) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              memberName={members.find((member) => member.id === expense.paidBy)?.name || 'Family'}
              currency={preferences.currency}
              onDelete={onDeleteExpense}
              last={index === filtered.length - 1}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type AddExpenseProps = {
  members: FamilyMember[];
  preferences: Preferences;
  onCancel: () => void;
  onSave: (expenses: Omit<Expense, 'id'>[]) => Promise<void>;
  onScanReceipt: (source: 'camera' | 'library' | 'pdf') => Promise<ReceiptScanResult | null>;
};

export function AddExpenseScreen({
  members,
  preferences,
  onCancel,
  onSave,
  onScanReceipt,
}: AddExpenseProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pc');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [subcategory, setSubcategory] = useState<string>(SUBCATEGORIES.Other[0]);
  const [date, setDate] = useState(todayString());
  const [paidBy, setPaidBy] = useState(preferences.selfId || members[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptSuggestion[] | null>(null);
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
          setReceiptItems(result.suggestions);
        } else {
          setReceiptItems(null);
          if (suggestion.title) setTitle(suggestion.title);
          if (suggestion.amount) setAmount(suggestion.amount);
          setQuantity(String(suggestion.quantity));
          setUnit(suggestion.unit);
        }
        if (suggestion.date) setDate(suggestion.date);
        selectCategory(suggestion.category);
        if (result.itemized && suggestion.category === 'Groceries') {
          setSubcategory('Pantry');
        }
        setScanFeedback({
          message: result.itemized
            ? `Found ${result.suggestions.length} bill items. Review them below before saving.`
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

  const save = async () => {
    if (!isValidDate(date)) {
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
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        }))
      : [{
          title: title.trim(),
          amount: Number(amount.replace(/,/g, '')),
          quantity: Number(quantity),
          unit: unit.trim(),
        }];
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
      Alert.alert('Check quantity and unit', 'Enter a positive quantity and a unit of up to 24 characters for each expense.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        expenses.map((expense) => ({
          ...expense,
          quantity: expense.quantity,
          unit: expense.unit,
          category,
          subcategory,
          date,
          paidBy,
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
        }))
      );
    } catch (error) {
      Alert.alert('Could not save expense', error instanceof Error ? error.message : 'Please try again.');
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
          <Pressable onPress={onCancel} style={styles.backButton} accessibilityRole="button">
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>FAMILY WALLET</Text>
            <Text style={styles.pageTitle}>Add expense</Text>
          </View>
        </View>

        <View style={styles.scanCard}>
          <View style={styles.scanCopy}>
            <Text style={styles.scanTitle}>Add from a receipt</Text>
            <Text style={styles.scanText}>Photos suggest one expense from the bill total. PDFs with item tables can create separate expenses for each item.</Text>
          </View>
          {scanning ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <View style={styles.scanButtons}>
              <Pressable style={styles.scanButton} onPress={() => void applyScan('camera')}>
                <Text style={styles.scanButtonText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.scanButton} onPress={() => void applyScan('library')}>
                <Text style={styles.scanButtonText}>Photo</Text>
              </Pressable>
              <Pressable style={styles.scanButton} onPress={() => void applyScan('pdf')}>
                <Text style={styles.scanButtonText}>PDF</Text>
              </Pressable>
            </View>
          )}
          {scanning && <Text style={styles.scanFeedback}>Reading receipt…</Text>}
          {scanFeedback && (
            <Text
              style={[styles.scanFeedback, scanFeedback.isError && styles.scanError]}
              accessibilityRole={scanFeedback.isError ? 'alert' : undefined}
            >
              {scanFeedback.message}
            </Text>
          )}
        </View>

        {receiptItems ? (
          <View style={styles.receiptItems}>
            <Text style={styles.inputLabel}>Items from bill ({receiptItems.length})</Text>
            <Text style={styles.receiptItemsHint}>Each item will be saved as a separate expense.</Text>
            {receiptItems.map((item, index) => (
              <View key={`${index}-${item.title}`} style={styles.receiptItemRow}>
                <TextInput
                  style={[styles.input, styles.receiptItemTitle]}
                  value={item.title}
                  onChangeText={(value) =>
                    setReceiptItems((current) =>
                      current?.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, title: value } : row
                      ) ?? null
                    )
                  }
                  placeholder="Item description"
                  placeholderTextColor="#9AA6B2"
                  maxLength={160}
                  accessibilityLabel={`Bill item ${index + 1} description`}
                />
                <TextInput
                  style={[styles.input, styles.receiptItemQuantity]}
                  value={String(item.quantity)}
                  onChangeText={(value) =>
                    setReceiptItems((current) =>
                      current?.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, quantity: value === '' ? 0 : Number(value) }
                          : row
                      ) ?? null
                    )
                  }
                  placeholder="Qty"
                  placeholderTextColor="#9AA6B2"
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Bill item ${index + 1} quantity`}
                />
                <TextInput
                  style={[styles.input, styles.receiptItemUnit]}
                  value={item.unit}
                  onChangeText={(value) =>
                    setReceiptItems((current) =>
                      current?.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, unit: value } : row
                      ) ?? null
                    )
                  }
                  placeholder="Unit"
                  placeholderTextColor="#9AA6B2"
                  maxLength={24}
                  accessibilityLabel={`Bill item ${index + 1} unit`}
                />
                <TextInput
                  style={[styles.input, styles.receiptItemAmount]}
                  value={item.amount}
                  onChangeText={(value) =>
                    setReceiptItems((current) =>
                      current?.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, amount: value } : row
                      ) ?? null
                    )
                  }
                  placeholder="0.00"
                  placeholderTextColor="#9AA6B2"
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Bill item ${index + 1} amount`}
                />
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
              placeholderTextColor="#9AA6B2"
              maxLength={160}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Amount ({preferences.currency})</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9AA6B2"
              keyboardType="decimal-pad"
              accessibilityLabel="Expense amount"
            />
            <Text style={styles.inputLabel}>Quantity and unit</Text>
            <View style={styles.manualQuantityRow}>
              <TextInput
                style={[styles.input, styles.receiptItemQuantity]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Quantity"
                placeholderTextColor="#9AA6B2"
                keyboardType="decimal-pad"
                accessibilityLabel="Expense quantity"
              />
              <TextInput
                style={[styles.input, styles.receiptItemUnit]}
                value={unit}
                onChangeText={setUnit}
                placeholder="Unit (e.g. kg, L, km)"
                placeholderTextColor="#9AA6B2"
                maxLength={24}
                accessibilityLabel="Expense unit"
              />
            </View>
          </>
        )}

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
        <DatePickerField label="Expense date" value={date} onChange={setDate} />

        <Text style={styles.inputLabel}>Paid by</Text>
        <View style={styles.chipWrap}>
          {members.map((member) => (
            <ChoiceChip key={member.id} label={member.name} selected={paidBy === member.id} onPress={() => setPaidBy(member.id)} />
          ))}
        </View>

        <Text style={styles.inputLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else to remember?"
          placeholderTextColor="#9AA6B2"
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
              : receiptItems
                ? `Save ${receiptItems.length} expenses`
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

type FamilyScreenProps = {
  members: FamilyMember[];
  onAddMember: (name: string) => Promise<void>;
};

export function FamilyScreen({ members, onAddMember }: FamilyScreenProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const add = async () => {
    const value = name.trim();
    if (!value) {
      Alert.alert('Enter a name', 'Add the family member’s name.');
      return;
    }
    if (members.some((member) => member.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      Alert.alert('Already added', 'There is already a family member with that name.');
      return;
    }
    setSaving(true);
    try {
      await onAddMember(value);
      setName('');
    } catch (error) {
      Alert.alert('Could not add member', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR HOUSEHOLD</Text>
      <Text style={styles.pageTitle}>Family members</Text>
      <Text style={styles.pageSubtitle}>Keep track of who paid for each expense.</Text>
      <View style={styles.addMemberCard}>
        <Text style={styles.cardTitle}>Add someone</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Family member name"
          placeholderTextColor="#9AA6B2"
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={() => void add()}
        />
        <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={() => void add()} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Adding…' : 'Add family member'}</Text>
        </Pressable>
      </View>
      <SectionHeading title={`Members (${members.length})`} />
      <View style={styles.card}>
        {members.map((member, index) => (
          <View key={member.id} style={[styles.memberRow, index === members.length - 1 && styles.noBorder]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.localTag}>ON THIS DEVICE</Text>
          </View>
        ))}
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>No account or server needed</Text>
        <Text style={styles.infoText}>
          Members and expenses are saved only on this phone. To share them with another family phone, export a backup in Settings and import it there.
        </Text>
      </View>
    </ScrollView>
  );
}

type SettingsScreenProps = {
  preferences: Preferences;
  onSave: (preferences: Preferences) => Promise<void>;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
};

export function SettingsScreen({ preferences, onSave, onExport, onImport }: SettingsScreenProps) {
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  React.useEffect(() => {
    setDisplayName(preferences.displayName);
    setCurrency(preferences.currency);
  }, [preferences.displayName, preferences.currency]);

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert('Enter a name', 'Your profile name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...preferences, displayName: displayName.trim(), currency });
      Alert.alert('Settings saved', 'Your preferences are stored on this device.');
    } catch (error) {
      Alert.alert('Could not save settings', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const transfer = async (action: 'export' | 'import') => {
    setTransferring(true);
    try {
      if (action === 'export') await onExport();
      else await onImport();
    } catch (error) {
      Alert.alert(
        action === 'export' ? 'Export failed' : 'Import failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setTransferring(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>PREFERENCES</Text>
      <Text style={styles.pageTitle}>Settings</Text>
      <Text style={styles.pageSubtitle}>Personalize your offline family tracker.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your profile</Text>
        <Text style={styles.inputLabel}>Your name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Name"
          placeholderTextColor="#9AA6B2"
          maxLength={100}
        />
        <Text style={styles.inputLabel}>Currency</Text>
        <View style={styles.chipWrap}>
          {CURRENCIES.map((code) => (
            <ChoiceChip key={code} label={code} selected={currency === code} onPress={() => setCurrency(code)} />
          ))}
        </View>
        <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={() => void save()} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save preferences'}</Text>
        </Pressable>
      </View>

      <SectionHeading title="Move data between phones" />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Manual backup sharing</Text>
        <Text style={styles.infoText}>
          Export creates a JSON backup you can share using Android’s share menu. Import merges new expenses and members without deleting existing data. Repeat the export/import when you want to share updates.
        </Text>
        {transferring ? (
          <ActivityIndicator color={COLORS.primary} style={styles.transferSpinner} />
        ) : (
          <View style={styles.transferButtons}>
            <Pressable style={styles.secondaryButton} onPress={() => void transfer('export')}>
              <Text style={styles.secondaryButtonText}>Export backup</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void transfer('import')}>
              <Text style={styles.secondaryButtonText}>Import backup</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.privacyPanel}>
        <Text style={styles.privacyPanelTitle}>Privacy first</Text>
        <Text style={styles.privacyPanelText}>
          Expense details and scanned receipt text stay on this device. Receipt images are not attached to entries or uploaded.
        </Text>
      </View>
    </ScrollView>
  );
}

export type AppScreen = 'home' | 'expenses' | 'add' | 'family' | 'reports' | 'settings';

export function BottomNavigation({
  active,
  onNavigate,
}: {
  active: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}) {
  const items: { screen: AppScreen; label: string }[] = [
    { screen: 'home', label: 'Home' },
    { screen: 'expenses', label: 'Expenses' },
    { screen: 'family', label: 'Family' },
    { screen: 'settings', label: 'Settings' },
  ];
  return (
    <View style={styles.bottomNavigation}>
      {items.slice(0, 2).map((item) => (
        <NavItem key={item.screen} {...item} active={active === item.screen} onNavigate={onNavigate} />
      ))}
      <Pressable
        style={styles.navAddButton}
        onPress={() => onNavigate('add')}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Text style={styles.navAddText}>＋</Text>
      </Pressable>
      {items.slice(2).map((item) => (
        <NavItem key={item.screen} {...item} active={active === item.screen} onNavigate={onNavigate} />
      ))}
    </View>
  );
}

function NavItem({
  screen,
  label,
  active,
  onNavigate,
}: {
  screen: AppScreen;
  label: string;
  active: boolean;
  onNavigate: (screen: AppScreen) => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={() => onNavigate(screen)} accessibilityRole="button">
      <View style={[styles.navDot, active && styles.navDotActive]} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ExpenseRow({
  expense,
  memberName,
  currency,
  onDelete,
  last,
}: {
  expense: Expense;
  memberName: string;
  currency: CurrencyCode;
  onDelete: (expense: Expense) => void;
  last: boolean;
}) {
  return (
    <View style={[styles.expenseRow, last && styles.noBorder]}>
      <View style={styles.expenseIcon}>
        <Text style={styles.expenseIconText}>{expense.category.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.expenseDescription}>
        <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.expenseMeta}>
          {expense.quantity} {expense.unit} · {expense.category} · {expense.subcategory} · {memberName} · {displayDate(expense.date)}
        </Text>
      </View>
      <View style={styles.expenseAmountWrap}>
        <Text style={styles.expenseAmount}>{formatMoney(expense.amount, currency)}</Text>
        <Pressable onPress={() => onDelete(expense)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${expense.title}`}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const DASHBOARD_CHART_COLORS = [
  '#226D5A',
  '#528AC7',
  '#D39236',
  '#8B6BB1',
  '#D36F68',
  '#4E9B9A',
  '#718096',
  '#A2AFBD',
];

function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  metricIcon: { color: COLORS.primary, fontSize: 17, fontWeight: '800', marginBottom: 5 },
  metricIconAmber: { color: COLORS.amber },
  metricValue: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  metricLabel: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  primaryButton: { backgroundColor: COLORS.primary, minHeight: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingHorizontal: 16 },
  primaryButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  disabledButton: { opacity: 0.6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  sectionAction: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
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
  pageTitle: { color: COLORS.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { color: COLORS.muted, fontSize: 13, marginBottom: 18 },
  searchInput: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, minHeight: 48, paddingHorizontal: 14, color: COLORS.ink, marginBottom: 14 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', minHeight: 78, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 11 },
  noBorder: { borderBottomWidth: 0 },
  expenseIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  expenseIconText: { color: COLORS.primary, fontWeight: '800' },
  expenseDescription: { flex: 1, marginRight: 6 },
  expenseTitle: { color: COLORS.ink, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  expenseMeta: { color: COLORS.muted, fontSize: 10 },
  expenseAmountWrap: { alignItems: 'flex-end', minWidth: 72 },
  expenseAmount: { color: COLORS.ink, fontWeight: '800', fontSize: 12 },
  deleteText: { color: COLORS.danger, fontSize: 10, fontWeight: '600', marginTop: 4 },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backButtonText: { color: COLORS.ink, fontSize: 30, lineHeight: 32, marginTop: -4 },
  scanCard: { backgroundColor: '#ECF5F1', borderRadius: 18, padding: 16, marginBottom: 18 },
  scanCopy: { marginBottom: 12 },
  scanTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  scanText: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  scanButtons: { flexDirection: 'row', gap: 8 },
  scanButton: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#D3E5DD' },
  scanButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  scanFeedback: { color: COLORS.primary, fontSize: 12, lineHeight: 17, marginTop: 10 },
  scanError: { color: COLORS.danger },
  receiptItems: { marginBottom: 8 },
  receiptItemsHint: { color: COLORS.muted, fontSize: 12, marginBottom: 8 },
  receiptItemRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  receiptItemTitle: { flex: 1 },
  receiptItemQuantity: { width: 68, paddingHorizontal: 8 },
  receiptItemUnit: { width: 70, paddingHorizontal: 8 },
  receiptItemAmount: { width: 110 },
  manualQuantityRow: { flexDirection: 'row', gap: 8 },
  inputLabel: { color: COLORS.ink, fontWeight: '700', fontSize: 12, marginBottom: 7, marginTop: 12 },
  input: { minHeight: 48, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 13, color: COLORS.ink, fontSize: 14 },
  notesInput: { minHeight: 82, paddingTop: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  choiceChip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14 },
  choiceChipSelected: { backgroundColor: COLORS.primaryLight, borderColor: '#9CCAB8' },
  choiceChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  choiceChipTextSelected: { color: COLORS.primary, fontWeight: '800' },
  cancelAction: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cancelActionText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  addMemberCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16 },
  cardTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F0EAF8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { color: '#674D8C', fontWeight: '800' },
  memberName: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  localTag: { color: COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  infoCard: { padding: 16, borderRadius: 18, backgroundColor: '#EEF4FA', marginTop: 16 },
  infoTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 14, marginBottom: 7 },
  infoText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  transferButtons: { flexDirection: 'row', gap: 9, marginTop: 14 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  transferSpinner: { marginTop: 16 },
  privacyPanel: { padding: 16, borderRadius: 18, backgroundColor: '#EAF4EF', marginTop: 16 },
  privacyPanelTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  privacyPanelText: { color: '#4E7164', fontSize: 12, lineHeight: 18 },
  bottomNavigation: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 5 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD3DC', marginBottom: 5 },
  navDotActive: { width: 16, borderRadius: 4, backgroundColor: COLORS.primary },
  navLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  navLabelActive: { color: COLORS.primary, fontWeight: '800' },
  navAddButton: { width: 45, height: 45, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, marginTop: -16 },
  navAddText: { color: COLORS.white, fontSize: 27, lineHeight: 30, marginTop: -2 },
});
