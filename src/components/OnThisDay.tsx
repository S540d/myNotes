import { Link } from 'react-router-dom';
import type { Note } from '../types/note';
import { findOnThisDay } from '../utils/onThisDay';
import { useI18n } from '../i18n/I18nContext';

export function OnThisDay({ notes }: { notes: Note[] }) {
  const { t } = useI18n();
  const entries = findOnThisDay(notes);
  if (entries.length === 0) return null;

  return (
    <div className="card mb-4 flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)]">{t.onThisDay.heading}</h2>
      {entries.map(({ note, yearsAgo }) => (
        <Link
          key={note.id}
          to={`/note/${note.id}`}
          className="text-sm text-[var(--text-primary)] hover:underline"
        >
          {t.onThisDay.yearsAgo(yearsAgo, note.title || t.noteCard.noTitle)}
        </Link>
      ))}
    </div>
  );
}
