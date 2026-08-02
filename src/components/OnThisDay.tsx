import { Link } from 'react-router-dom';
import type { Note } from '../types/note';
import { findOnThisDay } from '../utils/onThisDay';

export function OnThisDay({ notes }: { notes: Note[] }) {
  const entries = findOnThisDay(notes);
  if (entries.length === 0) return null;

  return (
    <div className="card mb-4 flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Am gleichen Tag</h2>
      {entries.map(({ note, yearsAgo }) => (
        <Link
          key={note.id}
          to={`/note/${note.id}`}
          className="text-sm text-[var(--text-primary)] hover:underline"
        >
          Vor {yearsAgo} {yearsAgo === 1 ? 'Jahr' : 'Jahren'}: {note.title || 'Ohne Titel'}
        </Link>
      ))}
    </div>
  );
}
