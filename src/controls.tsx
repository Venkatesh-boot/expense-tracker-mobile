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
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
      >
        <Text style={[styles.dropdownValue, !selected && styles.placeholder]}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionsCard} onPress={() => undefined}>
            <Text style={styles.optionsTitle}>{label}</Text>
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
                  {option.value === value ? <Text style={styles.checkmark}>✓</Text> : null}
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
  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setIosOpen(false);
      return;
    }
    if (selectedDate) onChange(toIsoDate(selectedDate));
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
        <Text style={styles.calendar}>▦</Text>
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
  dropdownValue: { color: COLORS.ink, fontSize: 14, fontWeight: '600', flex: 1 },
  placeholder: { color: COLORS.muted },
  chevron: { color: COLORS.primary, fontSize: 21, fontWeight: '700', marginLeft: 8, marginTop: -7 },
  calendar: { color: COLORS.primary, fontSize: 19, marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: '#14203377', justifyContent: 'center', padding: 24 },
  optionsCard: { maxHeight: '75%', backgroundColor: COLORS.white, borderRadius: 20, padding: 16 },
  optionsTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  optionsList: { flexGrow: 0 },
  option: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  optionSelected: { backgroundColor: COLORS.primaryLight },
  optionText: { flex: 1, color: COLORS.ink, fontSize: 14 },
  optionTextSelected: { color: COLORS.primary, fontWeight: '800' },
  checkmark: { color: COLORS.primary, fontWeight: '900' },
  dismissButton: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 10 },
  dismissText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  iosDateCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16 },
  iosDateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
