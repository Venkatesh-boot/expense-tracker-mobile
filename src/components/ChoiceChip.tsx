import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '../theme';

export function ChoiceChip({
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

const styles = StyleSheet.create({
  choiceChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
  },
  choiceChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: '#9CCAB8',
  },
  choiceChipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  choiceChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
