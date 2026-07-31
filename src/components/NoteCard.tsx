import { Link } from 'react-router-dom';
import type { Note } from '../types/note';

function excerpt(markdown: string, length = 160): string {
  const plain = markdown.replace(/[#*_>`~-]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      to={`/note/${note.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {note.title || 'Ohne Titel'}
        </h2>
        <time className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{note.entryDate}</time>
      </div>
      {note.bodyMarkdown && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{excerpt(note.bodyMarkdown)}</p>
      )}
      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
