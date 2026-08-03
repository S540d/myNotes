import { useState } from 'react';
import type { Note } from '../types/note';
import { useI18n } from '../i18n/I18nContext';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

export function ConflictBanner({ notes }: { notes: Note[] }) {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string>();

  const conflicted = notes.filter((note) => note.syncState === 'conflict');
  if (conflicted.length === 0) return null;

  const openNote = conflicted.find((note) => note.id === openId);

  return (
    <div className="card mb-4 flex flex-col gap-2 border-[var(--color-red)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-red)]">{t.conflict.bannerHeading}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{t.conflict.bannerDescription(conflicted.length)}</p>
      <div className="flex flex-col gap-2">
        {conflicted.map((note) => (
          <div key={note.id} className="flex items-center justify-between gap-2">
            <span className="text-sm text-[var(--text-primary)]">{note.title || t.noteCard.noTitle}</span>
            <button type="button" onClick={() => setOpenId(note.id)} className="btn btn-secondary">
              {t.conflict.resolve}
            </button>
          </div>
        ))}
      </div>

      {openNote && (
        <ConflictResolutionDialog
          note={openNote}
          onClose={() => setOpenId(undefined)}
          onResolved={() => setOpenId(undefined)}
        />
      )}
    </div>
  );
}
