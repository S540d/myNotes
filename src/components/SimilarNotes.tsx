import { Link } from 'react-router-dom';
import type { Note } from '../types/note';

export function SimilarNotes({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Ähnliche Einträge</h2>
      <div className="flex flex-col gap-1">
        {notes.map((note) => (
          <Link
            key={note.id}
            to={`/note/${note.id}`}
            className="text-sm text-[var(--text-primary)] hover:underline"
          >
            {note.title || 'Ohne Titel'}{' '}
            <span className="text-[var(--text-secondary)]">({note.entryDate})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
