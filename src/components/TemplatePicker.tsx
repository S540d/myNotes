import { getNoteTemplates } from '../data/noteTemplates';
import { useI18n } from '../i18n/I18nContext';

export function TemplatePicker({ onPick }: { onPick: (bodyMarkdown: string) => void }) {
  const { t, language } = useI18n();
  const templates = getNoteTemplates(language);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
      {t.note.templateLabel}
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onPick(template.bodyMarkdown)}
          className="chip"
        >
          {template.name}
        </button>
      ))}
    </div>
  );
}
