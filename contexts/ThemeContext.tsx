import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, themeForMode, type Theme } from '../constants/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = '@azoup_theme';

type ThemeContextValue = {
  isDark: boolean;
  theme: Theme;
  ready: boolean;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readStoredMode(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'light') return false;
    if (raw === 'dark') return true;
  } catch {
    /* default light */
  }
  return false;
}

async function persistMode(isDark: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const dark = await readStoredMode();
      if (!cancelled) {
        setIsDark(dark);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
    void persistMode(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      void persistMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      theme: themeForMode(isDark),
      ready,
      toggleTheme,
      setDark,
    }),
    [isDark, ready, toggleTheme, setDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: false,
      theme: lightTheme,
      ready: true,
      toggleTheme: () => {},
      setDark: () => {},
    };
  }
  return ctx;
}
