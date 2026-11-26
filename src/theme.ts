import React, { createContext, useContext, useMemo } from 'react';
import type { ExpenseCategory, ThemeMode } from './domain';

export const LIGHT_COLORS = {
  ink: '#0F172A',
  muted: '#64748B',
  background: '#F4F7FC',
  surface: '#FFFFFF',
  surfaceTint: '#EBF2FE',
  white: '#FFFFFF',
  onPrimary: '#FFFFFF',
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primaryMid: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  primarySoftText: '#DBEAFE',
  primaryAccentText: '#67E8F9',
  heroBg: '#1D4ED8',
  heroSubBg: '#1E40AF',
  secondary: '#06B6D4',
  secondaryLight: '#ECFEFF',
  success: '#059669',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  border: '#E2E8F0',
  danger: '#E11D48',
  dangerLight: '#FFF1F2',
  dangerBorder: '#FECDD3',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  purple: '#0284C7',
  purpleLight: '#E0F2FE',
  track: '#E8EEF7',
  backdrop: '#0F172A80',
  placeholder: '#94A3B8',
};

export type ThemeColors = typeof LIGHT_COLORS;

export const DARK_COLORS: ThemeColors = {
  ink: '#F1F5F9',
  muted: '#94A3B8',
  background: '#090E1A',
  surface: '#111827',
  surfaceTint: '#1E293B',
  white: '#111827',
  onPrimary: '#FFFFFF',
  primary: '#3B82F6',
  primaryDark: '#1E3A8A',
  primaryMid: '#60A5FA',
  primaryLight: '#172554',
  primaryBorder: '#1D4ED8',
  primarySoftText: '#DBEAFE',
  primaryAccentText: '#67E8F9',
  heroBg: '#1E3A8A',
  heroSubBg: '#172554',
  secondary: '#22D3EE',
  secondaryLight: '#083344',
  success: '#34D399',
  successLight: '#064E3B',
  successDark: '#065F46',
  border: '#1E293B',
  danger: '#FB7185',
  dangerLight: '#3B1222',
  dangerBorder: '#881337',
  amber: '#FBBF24',
  amberLight: '#3E2708',
  purple: '#38BDF8',
  purpleLight: '#0C4A6E',
  track: '#1E293B',
  backdrop: '#020617B3',
  placeholder: '#64748B',
};

export const COLORS = LIGHT_COLORS;

export const LIGHT_CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; fg: string }> = {
  Groceries: { bg: '#D1FAE5', fg: '#047857' },
  Food: { bg: '#FEF3C7', fg: '#B45309' },
  Transport: { bg: '#E0F2FE', fg: '#0369A1' },
  Home: { bg: '#FFEDD5', fg: '#C2410C' },
  Bills: { bg: '#DBEAFE', fg: '#1D4ED8' },
  Health: { bg: '#FFE4E6', fg: '#BE123C' },
  Shopping: { bg: '#FCE7F3', fg: '#BE185D' },
  Other: { bg: '#CCFBF1', fg: '#0F766E' },
};

export const DARK_CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; fg: string }> = {
  Groceries: { bg: '#064E3B', fg: '#6EE7B7' },
  Food: { bg: '#451A03', fg: '#FCD34D' },
  Transport: { bg: '#0C4A6E', fg: '#7DD3FC' },
  Home: { bg: '#431407', fg: '#FDBA74' },
  Bills: { bg: '#172554', fg: '#93C5FD' },
  Health: { bg: '#4C0519', fg: '#FDA4AF' },
  Shopping: { bg: '#500724', fg: '#F9A8D4' },
  Other: { bg: '#134E4A', fg: '#5EEAD4' },
};

export const CATEGORY_COLORS = LIGHT_CATEGORY_COLORS;

export type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  categoryColors: Record<ExpenseCategory, { bg: string; fg: string }>;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  isDark: false,
  colors: LIGHT_COLORS,
  categoryColors: LIGHT_CATEGORY_COLORS,
});

/** Provides active light or dark theme tokens to all descendant screens and components. */
export function ThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: React.ReactNode;
}) {
  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === 'dark';
    return {
      mode,
      isDark,
      colors: isDark ? DARK_COLORS : LIGHT_COLORS,
      categoryColors: isDark ? DARK_CATEGORY_COLORS : LIGHT_CATEGORY_COLORS,
    };
  }, [mode]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

/** Returns the active theme mode and color palette. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Memoizes a StyleSheet factory against the current active theme colors. */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
