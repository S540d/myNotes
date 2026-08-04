import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/theme';
import type { Language } from '../i18n/translations';

export function SettingsMenuPage() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useI18n();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t.settingsMenu.themeSystem },
    { value: 'light', label: t.settingsMenu.themeLight },
    { value: 'dark', label: t.settingsMenu.themeDark },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button type="button" onClick={() => navigate('/')} className="btn btn-ghost mb-4 !px-0">
        {t.common.back}
      </button>

      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">{t.settingsMenu.heading}</h1>

      <h2 className="mb-3 text-xl font-bold text-[var(--text-primary)]">{t.settingsMenu.appearanceHeading}</h2>
      <div className="mb-8 flex flex-col gap-3">
        <div className="field-label">
          {t.settingsMenu.themeLabel}
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setThemePreference(option.value)}
                className={`chip ${themePreference === option.value ? 'chip-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-label">
          {t.settingsMenu.languageLabel}
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={`chip ${language === option.value ? 'chip-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link to="/settings/sync" className="card block p-4">
          <span className="block font-semibold text-[var(--text-primary)]">{t.settingsMenu.syncCardTitle}</span>
          <span className="block text-sm text-[var(--text-secondary)]">{t.settingsMenu.syncCardDesc}</span>
        </Link>
        <Link to="/settings/import-export" className="card block p-4">
          <span className="block font-semibold text-[var(--text-primary)]">
            {t.settingsMenu.importExportCardTitle}
          </span>
          <span className="block text-sm text-[var(--text-secondary)]">{t.settingsMenu.importExportCardDesc}</span>
        </Link>
      </div>
    </div>
  );
}
