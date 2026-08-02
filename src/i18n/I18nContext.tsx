import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectDefaultLanguage, saveLanguage } from './language';
import { translations, type Language, type Translations } from './translations';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => detectDefaultLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    saveLanguage(next);
    setLanguageState(next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: translations[language] }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}
