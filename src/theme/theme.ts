export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'myNotes.theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function loadThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

export function saveThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
}

/** Resolves a user preference against the OS setting; 'system' defers entirely to `prefersDark`. */
export function resolveEffectiveTheme(preference: ThemePreference, prefersDark: boolean): EffectiveTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/**
 * Applies the effective theme to the document root as `data-theme`, which index.css uses to
 * override the `prefers-color-scheme` media query when the user picked an explicit preference.
 */
export function applyThemeToDocument(theme: EffectiveTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
