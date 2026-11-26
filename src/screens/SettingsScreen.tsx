import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CurrencyCode, Preferences, ThemePreference } from '../models';
import { CURRENCIES, CURRENCY_SYMBOLS, sanitizeQuantityInput } from '../models';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';
import { ChoiceChip } from '../components/ChoiceChip';
import { SectionHeading } from '../components/SectionHeading';

type SettingsScreenProps = {
  preferences: Preferences;
  onSave: (preferences: Preferences) => Promise<void>;
  onSelectTheme: (theme: ThemePreference) => void;
  onExport: () => Promise<void>;
  onExportCsv: () => Promise<void>;
  onImport: () => Promise<void>;
};

export function SettingsScreen({
  preferences,
  onSave,
  onSelectTheme,
  onExport,
  onExportCsv,
  onImport,
}: SettingsScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const themePreference: ThemePreference = preferences.theme ?? 'auto';
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency);
  const [budgetText, setBudgetText] = useState(
    preferences.monthlyBudget ? String(preferences.monthlyBudget) : ''
  );
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    setDisplayName(preferences.displayName);
    setCurrency(preferences.currency);
    setBudgetText(preferences.monthlyBudget ? String(preferences.monthlyBudget) : '');
  }, [preferences.displayName, preferences.currency, preferences.monthlyBudget]);

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert('Enter a name', 'Your profile name cannot be empty.');
      return;
    }
    const trimmedBudget = budgetText.trim();
    const parsedBudget = trimmedBudget ? Number(trimmedBudget) : undefined;
    if (
      trimmedBudget &&
      (!Number.isFinite(parsedBudget) || (parsedBudget ?? 0) <= 0 || (parsedBudget ?? 0) > 100_000_000)
    ) {
      Alert.alert('Check monthly budget', 'Enter a positive budget amount, or leave it blank.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...preferences,
        displayName: displayName.trim(),
        currency,
        monthlyBudget: parsedBudget,
        theme: themePreference,
      });
      Alert.alert('Settings saved', 'Your preferences are stored on this device.');
    } catch (error) {
      Alert.alert('Could not save settings', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const transfer = async (action: 'export' | 'csv' | 'import') => {
    setTransferring(true);
    try {
      if (action === 'export') await onExport();
      else if (action === 'csv') await onExportCsv();
      else await onImport();
    } catch (error) {
      Alert.alert(
        action === 'import' ? 'Import failed' : 'Export failed',
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
          placeholderTextColor={colors.placeholder}
          maxLength={100}
        />
        <Text style={styles.inputLabel}>Appearance</Text>
        <View style={styles.chipWrap}>
          <ChoiceChip
            label="Auto (6 AM–6 PM)"
            selected={themePreference === 'auto'}
            onPress={() => onSelectTheme('auto')}
          />
          <ChoiceChip
            label="Light"
            selected={themePreference === 'light'}
            onPress={() => onSelectTheme('light')}
          />
          <ChoiceChip
            label="Dark"
            selected={themePreference === 'dark'}
            onPress={() => onSelectTheme('dark')}
          />
        </View>
        <Text style={styles.inputLabel}>Currency</Text>
        <View style={styles.chipWrap}>
          {CURRENCIES.map((code) => (
            <ChoiceChip
              key={code}
              label={code}
              selected={currency === code}
              onPress={() => setCurrency(code)}
            />
          ))}
        </View>
        <Text style={styles.inputLabel}>
          Monthly budget ({CURRENCY_SYMBOLS[currency]}, optional)
        </Text>
        <TextInput
          style={styles.input}
          value={budgetText}
          onChangeText={(value) => setBudgetText(sanitizeQuantityInput(value))}
          placeholder="e.g. 25000 (leave blank for none)"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          inputMode="decimal"
          accessibilityLabel="Monthly budget"
        />
        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={() => void save()}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save preferences'}</Text>
        </Pressable>
      </View>

      <SectionHeading title="Backup & export" />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Manual backup & spreadsheet export</Text>
        <Text style={styles.infoText}>
          Export creates a JSON backup you can share or download to move data to another device. Import merges new expenses and members without deleting existing data. You can also export a CSV spreadsheet for Excel or Google Sheets.
        </Text>
        {transferring ? (
          <ActivityIndicator color={colors.primary} style={styles.transferSpinner} />
        ) : (
          <View style={styles.transferStack}>
            <View style={styles.transferButtons}>
              <Pressable style={styles.secondaryButton} onPress={() => void transfer('export')}>
                <Text style={styles.secondaryButtonText}>Export JSON</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void transfer('import')}>
                <Text style={styles.secondaryButtonText}>Import JSON</Text>
              </Pressable>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => void transfer('csv')}>
              <Text style={styles.secondaryButtonText}>Export CSV spreadsheet</Text>
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pageContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    pageTitle: { color: colors.ink, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    pageSubtitle: { color: colors.muted, fontSize: 13, marginBottom: 18 },
    card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
    cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15, marginBottom: 4 },
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
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    primaryButton: { backgroundColor: colors.primary, minHeight: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 16, paddingHorizontal: 16 },
    primaryButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
    disabledButton: { opacity: 0.6 },
    infoCard: { padding: 16, borderRadius: 18, backgroundColor: colors.surfaceTint },
    infoTitle: { color: colors.ink, fontWeight: '800', fontSize: 14, marginBottom: 7 },
    infoText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    transferStack: { gap: 9, marginTop: 14 },
    transferButtons: { flexDirection: 'row', gap: 9 },
    secondaryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    secondaryButtonText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    transferSpinner: { marginTop: 16 },
    privacyPanel: { padding: 16, borderRadius: 18, backgroundColor: colors.primaryLight, marginTop: 16, borderWidth: 1, borderColor: colors.primaryBorder },
    privacyPanelTitle: { color: colors.primary, fontWeight: '800', fontSize: 14, marginBottom: 6 },
    privacyPanelText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  });
