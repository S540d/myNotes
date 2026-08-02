import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyThemeToDocument,
  loadThemePreference,
  resolveEffectiveTheme,
  saveThemePreference,
  type EffectiveTheme,
  type ThemePreference,
} from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  effective: EffectiveTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function prefersDarkNow(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadThemePreference());
  const [prefersDark, setPrefersDark] = useState(() => prefersDarkNow());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setPrefersDark(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const effective = useMemo(() => resolveEffectiveTheme(preference, prefersDark), [preference, prefersDark]);

  useEffect(() => {
    applyThemeToDocument(effective);
  }, [effective]);

  const setPreference = (next: ThemePreference) => {
    saveThemePreference(next);
    setPreferenceState(next);
  };

  return <ThemeContext.Provider value={{ preference, effective, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
