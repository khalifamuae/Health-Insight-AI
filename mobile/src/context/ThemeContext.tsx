import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'themeModePreference';

export interface AppThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const lightColors: AppThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  text: '#1e293b',
  mutedText: '#64748b',
  border: '#e2e8f0',
  primary: '#3b82f6',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const darkColors: AppThemeColors = {
  background: '#0b1220',
  card: '#111827',
  cardAlt: '#1f2937',
  text: '#e2e8f0',
  mutedText: '#94a3b8',
  border: '#334155',
  primary: '#60a5fa',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_MODE_KEY)
      .then((value) => {
        if (value === 'system' || value === 'light' || value === 'dark') {
          setModeState(value);
        }
      })
      .catch(() => {});
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await SecureStore.setItemAsync(THEME_MODE_KEY, nextMode);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      setMode,
    }),
    [mode, isDark, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}
