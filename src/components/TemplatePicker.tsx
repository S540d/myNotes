import { noteTemplates } from '../data/noteTemplates';

export function TemplatePicker({ onPick }: { onPick: (bodyMarkdown: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
      Vorlage:
      {noteTemplates.map((template) => (
        <button
          key={template.name}
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
