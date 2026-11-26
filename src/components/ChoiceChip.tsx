import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    choiceChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 14,
    },
    choiceChipSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryBorder,
    },
    choiceChipText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    choiceChipTextSelected: {
      color: colors.primary,
      fontWeight: '800',
    },
  });
