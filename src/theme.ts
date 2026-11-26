import React, { createContext, useContext, useMemo } from 'react';
import type { ExpenseCategory, ThemeMode } from './domain';

export const LIGHT_COLORS = {
  ink: '#13172B',
  muted: '#646B84',
  background: '#F2F4FB',
  surface: '#FFFFFF',
  surfaceTint: '#ECEFFB',
  white: '#FFFFFF',
  onPrimary: '#FFFFFF',
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryMid: '#6366F1',
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  primarySoftText: '#E0E7FF',
  primaryAccentText: '#A5F3FC',
  heroBg: '#4F46E5',
  heroSubBg: '#3730A3',
  secondary: '#0EA5E9',
  secondaryLight: '#E0F2FE',
  success: '#059669',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  border: '#E2E6F3',
  danger: '#E11D48',
  dangerLight: '#FFF1F2',
  dangerBorder: '#FECDD3',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  track: '#EAEDF7',
  backdrop: '#0F122680',
  placeholder: '#949BB3',
};

export type ThemeColors = typeof LIGHT_COLORS;

export const DARK_COLORS: ThemeColors = {
  ink: '#EEF2FF',
  muted: '#9AA4C4',
  background: '#0B0F1E',
  surface: '#151B31',
  surfaceTint: '#1F2745',
  white: '#151B31',
  onPrimary: '#FFFFFF',
  primary: '#6366F1',
  primaryDark: '#312E81',
  primaryMid: '#818CF8',
  primaryLight: '#232852',
  primaryBorder: '#4338CA',
  primarySoftText: '#E0E7FF',
  primaryAccentText: '#67E8F9',
  heroBg: '#312E81',
  heroSubBg: '#232063',
  secondary: '#38BDF8',
  secondaryLight: '#102A43',
  success: '#34D399',
  successLight: '#064E3B',
  successDark: '#065F46',
  border: '#252E4D',
  danger: '#FB7185',
  dangerLight: '#3B1222',
  dangerBorder: '#881337',
  amber: '#FBBF24',
  amberLight: '#3E2708',
  purple: '#A78BFA',
  purpleLight: '#2E1A59',
  track: '#1E2642',
  backdrop: '#040712B3',
  placeholder: '#6C7696',
};

export const COLORS = LIGHT_COLORS;

export const LIGHT_CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; fg: string }> = {
  Groceries: { bg: '#D1FAE5', fg: '#047857' },
  Food: { bg: '#FEF3C7', fg: '#B45309' },
  Transport: { bg: '#E0F2FE', fg: '#0369A1' },
  Home: { bg: '#F3E8FF', fg: '#6D28D9' },
  Bills: { bg: '#EEF2FF', fg: '#4338CA' },
  Health: { bg: '#FFE4E6', fg: '#BE123C' },
  Shopping: { bg: '#FCE7F3', fg: '#BE185D' },
  Other: { bg: '#CCFBF1', fg: '#0F766E' },
};

export const DARK_CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; fg: string }> = {
  Groceries: { bg: '#064E3B', fg: '#6EE7B7' },
  Food: { bg: '#451A03', fg: '#FCD34D' },
  Transport: { bg: '#0C4A6E', fg: '#7DD3FC' },
  Home: { bg: '#3B0764', fg: '#D8B4FE' },
  Bills: { bg: '#1E1B4B', fg: '#A5B4FC' },
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
