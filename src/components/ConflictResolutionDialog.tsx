import { useState } from 'react';
import type { Note } from '../types/note';
import { resolveConflictKeepBoth, resolveConflictKeepLocal, resolveConflictKeepRemote } from '../db/repository';
import { useI18n } from '../i18n/I18nContext';

interface ConflictResolutionDialogProps {
  note: Note;
  onResolved: () => void;
  onClose: () => void;
}

function VersionColumn({
  heading,
  title,
  entryDate,
  tags,
  bodyMarkdown,
}: {
  heading: string;
  title: string;
  entryDate: string;
  tags: string[];
  bodyMarkdown: string;
}) {
  const { t } = useI18n();
  return (
    <div className="card flex-1 p-3 text-sm">
      <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{heading}</h3>
      <dl className="flex flex-col gap-2">
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">{t.conflict.fieldTitle}</dt>
          <dd className="text-[var(--text-primary)]">{title || t.noteCard.noTitle}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">{t.conflict.fieldDate}</dt>
          <dd className="text-[var(--text-primary)]">{entryDate}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">{t.conflict.fieldTags}</dt>
          <dd className="text-[var(--text-primary)]">{tags.length > 0 ? tags.map((tag) => `#${tag}`).join(' ') : '–'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--text-secondary)]">{t.conflict.fieldBody}</dt>
          <dd className="whitespace-pre-wrap text-[var(--text-primary)]">{bodyMarkdown || '–'}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ConflictResolutionDialog({ note, onResolved, onClose }: ConflictResolutionDialogProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const shadow = note.conflictShadow;

  const runResolution = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--bg-color)] p-6">
        <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{t.conflict.dialogHeading}</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{t.conflict.dialogDescription}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <VersionColumn
            heading={t.conflict.localHeading}
            title={note.title}
            entryDate={note.entryDate}
            tags={note.tags}
            bodyMarkdown={note.bodyMarkdown}
          />
          {shadow ? (
            <VersionColumn
              heading={t.conflict.remoteHeading}
              title={shadow.title}
              entryDate={shadow.entryDate}
              tags={shadow.tags}
              bodyMarkdown={shadow.bodyMarkdown}
            />
          ) : (
            <div className="card flex-1 p-3 text-sm text-[var(--text-secondary)]">{t.conflict.noShadowNotice}</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => runResolution(() => resolveConflictKeepLocal(note.id))}
            className="btn btn-primary"
          >
            {t.conflict.keepLocal}
          </button>
          <button
            type="button"
            disabled={busy || !shadow}
            onClick={() => runResolution(() => resolveConflictKeepRemote(note.id))}
            className="btn btn-secondary"
          >
            {t.conflict.keepRemote}
          </button>
          <button
            type="button"
            disabled={busy || !shadow}
            onClick={() => runResolution(() => resolveConflictKeepBoth(note.id, t.conflict.copyTitleSuffix))}
            className="btn btn-secondary"
          >
            {t.conflict.keepBoth}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="btn btn-ghost ml-auto">
            {t.conflict.close}
          </button>
        </div>
      </div>
    </div>
  );
}
