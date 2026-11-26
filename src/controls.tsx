import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { displayDate } from './models';
import { COLORS } from './theme';
import { AppIcon } from './components/AppIcon';

export type DropdownOption<T extends string> = {
  label: string;
  value: T;
};

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  compact = false,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={compact ? styles.compactField : styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.dropdown, compact && styles.dropdownCompact]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Option'}: ${selected?.label || placeholder}`}
      >
        <Text style={[styles.dropdownValue, compact && styles.dropdownValueCompact, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <View style={styles.iconRight}>
          <AppIcon name="chevronDown" color={COLORS.primary} size={compact ? 14 : 16} />
        </View>
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionsCard} onPress={() => undefined}>
            <Text style={styles.optionsTitle}>{label || 'Choose an option'}</Text>
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.option, option.value === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, option.value === value && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {option.value === value ? <AppIcon name="check" color={COLORS.primary} size={16} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.dismissButton} onPress={() => setOpen(false)}>
              <Text style={styles.dismissText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const parsedDate = parseDate(value) || new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setIosOpen(false);
      return;
    }
    if (selectedDate) onChange(toIsoDate(selectedDate));
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.dropdown}>
          {React.createElement('input', {
            type: 'date',
            value,
            max: '2100-12-31',
            'aria-label': label,
            onChange: (event: { target: { value: string } }) => {
              if (event.target.value) {
                onChange(event.target.value);
              }
            },
            style: {
              flex: 1,
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: COLORS.ink,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
            },
          })}
        </View>
      </View>
    );
  }

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parsedDate,
        mode: 'date',
        display: 'calendar',
        onChange: handleChange,
        maximumDate: new Date(2100, 11, 31),
      });
    } else {
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.dropdown}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayDate(value)}`}
      >
        <Text style={styles.dropdownValue}>{displayDate(value)}</Text>
        <View style={styles.iconRight}>
          <AppIcon name="calendar" color={COLORS.primary} size={17} />
        </View>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal transparent visible={iosOpen} animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIosOpen(false)}>
            <Pressable style={styles.iosDateCard} onPress={() => undefined}>
              <View style={styles.iosDateHeader}>
                <Text style={styles.optionsTitle}>{label}</Text>
                <Pressable onPress={() => setIosOpen(false)}>
                  <Text style={styles.dismissText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={parsedDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={new Date(2100, 11, 31)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const result = new Date(year, month, day);
  return result.getFullYear() === year && result.getMonth() === month && result.getDate() === day
    ? result
    : null;
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  field: { marginTop: 12 },
  compactField: { marginTop: 0 },
  label: { color: COLORS.ink, fontWeight: '700', fontSize: 12, marginBottom: 7 },
  dropdown: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
  },
  dropdownCompact: {
    minHeight: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dropdownValue: { color: COLORS.ink, fontSize: 14, fontWeight: '600', flex: 1 },
  dropdownValueCompact: { fontSize: 12 },
  placeholder: { color: COLORS.muted },
  iconRight: { marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: '#14203377', justifyContent: 'center', padding: 24 },
  optionsCard: { maxHeight: '75%', backgroundColor: COLORS.white, borderRadius: 20, padding: 16 },
  optionsTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  optionsList: { flexGrow: 0 },
  option: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  optionSelected: { backgroundColor: COLORS.primaryLight },
  optionText: { flex: 1, color: COLORS.ink, fontSize: 14 },
  optionTextSelected: { color: COLORS.primary, fontWeight: '800' },
  dismissButton: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 10 },
  dismissText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  iosDateCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16 },
  iosDateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
