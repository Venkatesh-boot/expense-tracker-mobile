import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';

export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 25,
      marginBottom: 12,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionAction: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
  });
