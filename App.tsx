import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  addExpense,
  addExpenses,
  addMember,
  initializeDatabase,
  loadExpenses,
  loadMembers,
  loadPreferences,
  removeExpense,
  removeMember,
  renameMember,
  savePreferences,
  updateExpense,
} from './src/database';
import type { Expense, FamilyMember, Preferences } from './src/models';
import { createId } from './src/models';
import { COLORS } from './src/theme';
import { AppIcon } from './src/components/AppIcon';
import type { AppIconName } from './src/components/AppIcon';
import { ExpenseDetailModal } from './src/components/ExpenseDetailModal';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { FamilyScreen } from './src/screens/FamilyScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import type { AppScreen } from './src/screens/types';
import { ReportsScreen } from './src/reports';
import { scanReceipt } from './src/receipt';
import { exportBackup, exportCsv, importBackup } from './src/transfer';

const ANDROID_TOP_INSET = Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0;

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [returnScreen, setReturnScreen] = useState<AppScreen>('home');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    currency: 'INR',
    displayName: 'You',
    selfId: '',
  });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const refresh = useCallback(async () => {
    const [savedExpenses, savedMembers, savedPreferences] = await Promise.all([
      loadExpenses(),
      loadMembers(),
      loadPreferences(),
    ]);
    setExpenses(savedExpenses);
    setMembers(savedMembers);
    setPreferences(savedPreferences);
  }, []);

  const start = useCallback(async () => {
    setLoadError('');
    setReady(false);
    try {
      await initializeDatabase();
      await refresh();
      setReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Local storage could not be opened.');
    }
  }, [refresh]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (selectedExpense) {
        setSelectedExpense(null);
        return true;
      }
      if (screen === 'add' && editingExpense) {
        setEditingExpense(null);
        setScreen(returnScreen);
        return true;
      }
      if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [editingExpense, menuOpen, returnScreen, screen, selectedExpense]);

  const openAddExpense = (from: AppScreen) => {
    setEditingExpense(null);
    setReturnScreen(from);
    setScreen('add');
  };

  const openEditExpense = (expense: Expense) => {
    setSelectedExpense(null);
    setEditingExpense(expense);
    setReturnScreen(screen === 'add' ? 'expenses' : screen);
    setScreen('add');
  };

  const saveNewExpenses = async (newExpenses: Omit<Expense, 'id'>[]) => {
    const expensesToSave = newExpenses.map((expense) => ({ ...expense, id: createId() }));
    if (expensesToSave.length === 1) {
      await addExpense(expensesToSave[0]);
    } else {
      await addExpenses(expensesToSave);
    }
    await refresh();
    setEditingExpense(null);
    setScreen('expenses');
  };

  const saveEditedExpense = async (updated: Expense) => {
    await updateExpense(updated);
    await refresh();
    setEditingExpense(null);
    setScreen(returnScreen === 'add' ? 'expenses' : returnScreen);
  };

  const executeDeleteExpense = async (expense: Expense) => {
    try {
      await removeExpense(expense.id);
      setSelectedExpense((current) => (current?.id === expense.id ? null : current));
      await refresh();
    } catch (error) {
      Alert.alert(
        'Could not delete expense',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const confirmDeleteExpense = (expense: Expense) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Remove “${expense.title}” from this device?`)) {
        void executeDeleteExpense(expense);
      }
      return;
    }
    Alert.alert('Delete expense?', `Remove “${expense.title}” from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void executeDeleteExpense(expense);
        },
      },
    ]);
  };

  const saveFamilyMember = async (name: string) => {
    await addMember({ id: createId(), name });
    await refresh();
  };

  const handleRenameMember = async (id: string, name: string) => {
    await renameMember(id, name);
    await refresh();
  };

  const handleRemoveMember = async (id: string, reassignToId: string) => {
    await removeMember(id, reassignToId);
    await refresh();
  };

  const saveSettings = async (updated: Preferences) => {
    await savePreferences(updated);
    await refresh();
  };

  const handleImport = async () => {
    const result = await importBackup();
    if (result.cancelled) return;
    await refresh();
    Alert.alert(
      'Import complete',
      `${result.currencyChanged ? `Currency set to ${result.currency}. ` : ''}Added ${result.expensesAdded} ${result.expensesAdded === 1 ? 'expense' : 'expenses'} and ${result.membersAdded} ${result.membersAdded === 1 ? 'member' : 'members'}. Existing records were kept.`
    );
  };

  const navigate = (nextScreen: AppScreen) => {
    if (nextScreen === 'add') {
      setEditingExpense(null);
      setReturnScreen(screen);
    } else {
      setEditingExpense(null);
    }
    setScreen(nextScreen);
    setMenuOpen(false);
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <View style={styles.loadingContent}>
          <View style={styles.logoMark}><Text style={styles.logoText}>F</Text></View>
          <Text style={styles.loadingTitle}>Family expenses</Text>
          {loadError ? (
            <>
              <Text style={styles.loadError}>{loadError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void start()}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={COLORS.primary} style={styles.loadingSpinner} />
              <Text style={styles.loadingHint}>Opening your private local ledger…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <Pressable
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <AppIcon name="menu" color={COLORS.ink} size={22} />
          </Pressable>
          <View style={styles.logoMarkSmall}><Text style={styles.logoTextSmall}>F</Text></View>
          <View>
            <Text style={styles.brandTitle}>Family expenses</Text>
            <Text style={styles.brandSubtitle}>A private household ledger</Text>
          </View>
        </View>

        <View style={styles.screenContent}>
          {screen === 'home' && (
            <DashboardScreen
              expenses={expenses}
              members={members}
              preferences={preferences}
              onAddExpense={() => openAddExpense('home')}
              onShowExpenses={() => setScreen('expenses')}
              onSelectExpense={setSelectedExpense}
              onDeleteExpense={confirmDeleteExpense}
            />
          )}
          {screen === 'expenses' && (
            <ExpensesScreen
              expenses={expenses}
              members={members}
              preferences={preferences}
              onSelectExpense={setSelectedExpense}
              onDeleteExpense={confirmDeleteExpense}
            />
          )}
          {screen === 'add' && (
            <AddExpenseScreen
              key={editingExpense?.id ?? 'new'}
              members={members}
              preferences={preferences}
              editingExpense={editingExpense}
              onCancel={() => {
                setEditingExpense(null);
                setScreen(returnScreen);
              }}
              onSave={saveNewExpenses}
              onUpdate={saveEditedExpense}
              onScanReceipt={scanReceipt}
            />
          )}
          {screen === 'family' && (
            <FamilyScreen
              members={members}
              expenses={expenses}
              selfId={preferences.selfId}
              onAddMember={saveFamilyMember}
              onRenameMember={handleRenameMember}
              onRemoveMember={handleRemoveMember}
            />
          )}
          {screen === 'reports' && (
            <ReportsScreen
              expenses={expenses}
              members={members}
              currency={preferences.currency}
            />
          )}
          {screen === 'settings' && (
            <SettingsScreen
              preferences={preferences}
              onSave={saveSettings}
              onExport={exportBackup}
              onExportCsv={exportCsv}
              onImport={handleImport}
            />
          )}
        </View>

        <ExpenseDetailModal
          expense={selectedExpense}
          memberName={selectedExpense ? memberNames.get(selectedExpense.paidBy) || 'Family' : ''}
          currency={preferences.currency}
          onClose={() => setSelectedExpense(null)}
          onEdit={openEditExpense}
          onDelete={confirmDeleteExpense}
        />

        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerScrim} onPress={() => setMenuOpen(false)} />
            <View style={styles.drawer}>
              <View style={styles.drawerHeader}>
                <View style={styles.logoMarkSmall}><Text style={styles.logoTextSmall}>F</Text></View>
                <View style={styles.flex}>
                  <Text style={styles.brandTitle}>Family expenses</Text>
                  <Text style={styles.brandSubtitle}>{preferences.displayName}'s household</Text>
                </View>
                <Pressable
                  onPress={() => setMenuOpen(false)}
                  style={styles.drawerCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                >
                  <AppIcon name="close" color={COLORS.muted} size={18} />
                </Pressable>
              </View>
              <Text style={styles.drawerSection}>MENU</Text>
              {([
                ['home', 'home', 'Dashboard'],
                ['add', 'add', 'Add expense'],
                ['expenses', 'list', 'All expenses'],
                ['reports', 'chart', 'Reports'],
                ['family', 'family', 'Family members'],
                ['settings', 'settings', 'Settings'],
              ] as [AppScreen, AppIconName, string][]).map(([target, icon, label]) => {
                const active = screen === target;
                return (
                  <Pressable
                    key={target}
                    style={[styles.drawerItem, active && styles.drawerItemActive]}
                    onPress={() => navigate(target)}
                    accessibilityRole="button"
                  >
                    <View style={styles.drawerIconWrap}>
                      <AppIcon name={icon} color={active ? COLORS.primary : COLORS.muted} size={18} />
                    </View>
                    <Text style={[styles.drawerLabel, active && styles.drawerLabelActive]}>{label}</Text>
                  </Pressable>
                );
              })}
              <View style={styles.drawerFooter}>
                <Text style={styles.drawerFooterTitle}>Private & offline</Text>
                <Text style={styles.drawerFooterText}>Your expenses stay on this device.</Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, paddingTop: ANDROID_TOP_INSET },
  app: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },
  menuButton: { width: 38, height: 40, justifyContent: 'center', marginRight: 6 },
  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  logoMarkSmall: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoTextSmall: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  brandTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  brandSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  screenContent: { flex: 1 },
  loadingScreen: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 28 },
  loadingContent: { alignItems: 'center', width: '100%', maxWidth: 340 },
  loadingTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  loadingHint: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  loadingSpinner: { marginVertical: 16 },
  loadError: { color: COLORS.danger, textAlign: 'center', fontSize: 13, lineHeight: 19, marginVertical: 10 },
  retryButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  retryText: { color: COLORS.white, fontWeight: '800' },
  flex: { flex: 1 },
  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: '#14203377' },
  drawerScrim: StyleSheet.absoluteFill,
  drawer: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    paddingHorizontal: 18,
    paddingTop: Math.max(16, ANDROID_TOP_INSET + 12),
    paddingBottom: 24,
    elevation: 18,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  drawerCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  drawerSection: { color: COLORS.muted, fontWeight: '800', letterSpacing: 1.3, fontSize: 10, marginTop: 22, marginBottom: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderRadius: 13, paddingHorizontal: 12, marginBottom: 5 },
  drawerItemActive: { backgroundColor: COLORS.primaryLight },
  drawerIconWrap: { width: 31, alignItems: 'flex-start', justifyContent: 'center' },
  drawerLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  drawerLabelActive: { color: COLORS.primary, fontWeight: '800' },
  drawerFooter: { marginTop: 'auto', borderRadius: 14, backgroundColor: COLORS.primaryLight, padding: 14 },
  drawerFooterTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginBottom: 4 },
  drawerFooterText: { color: COLORS.muted, fontSize: 11 },
});
