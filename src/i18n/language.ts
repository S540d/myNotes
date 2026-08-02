import type { Language } from './translations';

const STORAGE_KEY = 'myNotes.language';

export function isLanguage(value: unknown): value is Language {
  return value === 'de' || value === 'en';
}

/** Falls back to the browser's language when nothing was chosen yet, defaulting to German (the app's original language). */
export function detectDefaultLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'de';
}

export function saveLanguage(language: Language): void {
  localStorage.setItem(STORAGE_KEY, language);
}
