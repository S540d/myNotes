import { Link } from 'react-router-dom';
import type { Note } from '../types/note';
import { useI18n } from '../i18n/I18nContext';

function excerpt(markdown: string, length = 160): string {
  const plain = markdown.replace(/[#*_>`~-]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

const statusDotClass: Record<Note['syncState'], string> = {
  synced: 'status-dot-synced',
  pending: 'status-dot-pending',
  conflict: 'status-dot-conflict',
};

export function NoteCard({ note }: { note: Note }) {
  const { t } = useI18n();
  const statusLabel: Record<Note['syncState'], string> = {
    synced: t.noteCard.synced,
    pending: t.noteCard.pending,
    conflict: t.noteCard.conflict,
  };

  return (
    <Link
      to={`/note/${note.id}`}
      className="card block p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{note.title || t.noteCard.noTitle}</h2>
        <time className="shrink-0 text-sm text-[var(--text-secondary)]">{note.entryDate}</time>
      </div>
      {note.bodyMarkdown && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{excerpt(note.bodyMarkdown)}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {note.tags.map((tag) => (
          <span key={tag} className="chip">
            #{tag}
          </span>
        ))}
        {note.syncState !== 'synced' && (
          <span
            className="inline-flex items-center gap-1 text-xs text-[var(--text-light)]"
            title={statusLabel[note.syncState]}
          >
            <span className={`status-dot ${statusDotClass[note.syncState]}`} />
            {statusLabel[note.syncState]}
          </span>
        )}
      </div>
    </Link>
  );
}
