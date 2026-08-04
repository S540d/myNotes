import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNote, listNotes } from '../db/repository';
import type { NoteDraft } from '../types/note';
import { exportAsJson, exportAsMarkdownZip } from '../export/exporters';
import { triggerDownload } from '../export/download';
import { detectImporter, type Importer } from '../importers';
import { useI18n } from '../i18n/I18nContext';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ImportExportPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);

  const [importer, setImporter] = useState<Importer>();
  const [drafts, setDrafts] = useState<NoteDraft[]>();
  const [selected, setSelected] = useState<boolean[]>([]);
  const [error, setError] = useState<string>();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<number>();

  const handleExportJson = async () => {
    setExporting(true);
    try {
      triggerDownload(exportAsJson(await listNotes()), `myNotes-export-${todayIso()}.json`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportMarkdownZip = async () => {
    setExporting(true);
    try {
      triggerDownload(await exportAsMarkdownZip(await listNotes()), `myNotes-export-${todayIso()}.zip`);
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(undefined);
    setDrafts(undefined);
    setResult(undefined);
    setImporter(undefined);

    const found = await detectImporter(file);
    if (!found) {
      setError(t.importExport.formatNotRecognized);
      return;
    }
    setImporter(found);

    try {
      const parsed = await found.parse(file);
      setDrafts(parsed);
      setSelected(parsed.map(() => true));
    } catch (err) {
      setError(t.importExport.parseError(err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const toggleSelected = (index: number) => {
    setSelected((current) => current.map((value, i) => (i === index ? !value : value)));
  };

  const handleImport = async () => {
    if (!drafts) return;
    setImporting(true);
    let count = 0;
    for (let i = 0; i < drafts.length; i++) {
      if (!selected[i]) continue;
      await createNote(drafts[i]);
      count += 1;
    }
    setImporting(false);
    setResult(count);
    setDrafts(undefined);
    setImporter(undefined);
  };

  const selectedCount = selected.filter(Boolean).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button type="button" onClick={() => navigate('/settings')} className="btn btn-ghost mb-4 !px-0">
        {t.common.back}
      </button>

      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">{t.importExport.heading}</h1>

      <h2 className="mb-3 text-xl font-bold text-[var(--text-primary)]">{t.importExport.exportHeading}</h2>
      <div className="mb-8 flex flex-wrap gap-2">
        <button type="button" disabled={exporting} onClick={() => void handleExportJson()} className="btn btn-secondary">
          {t.importExport.exportJson}
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExportMarkdownZip()}
          className="btn btn-secondary"
        >
          {t.importExport.exportMarkdownZip}
        </button>
      </div>

      <h2 className="mb-3 text-xl font-bold text-[var(--text-primary)]">{t.importExport.importHeading}</h2>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="card mb-4 flex cursor-pointer flex-col items-center gap-2 border-dashed p-6 text-center"
      >
        <p className="text-sm text-[var(--text-secondary)]">{t.importExport.dropzoneText}</p>
        <span className="btn btn-secondary">{t.importExport.chooseFile}</span>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {error && <p className="mb-4 text-sm text-[var(--color-red)]">{error}</p>}

      {result !== undefined && <p className="mb-4 text-sm text-[var(--color-green)]">{t.importExport.importResult(result)}</p>}

      {drafts && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {t.importExport.detectedFormat(importer?.label ?? '')} · {t.importExport.previewCount(drafts.length)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(drafts.map(() => true))}
              className="btn btn-ghost !px-0 text-sm"
            >
              {t.importExport.selectAll}
            </button>
            <button
              type="button"
              onClick={() => setSelected(drafts.map(() => false))}
              className="btn btn-ghost !px-0 text-sm"
            >
              {t.importExport.deselectAll}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {drafts.map((draft, index) => (
              <label key={index} className="card flex items-start gap-3 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected[index] ?? false}
                  onChange={() => toggleSelected(index)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{draft.title || t.noteCard.noTitle}</span>
                    <span className="shrink-0 text-xs text-[var(--text-secondary)]">{draft.entryDate}</span>
                  </div>
                  {draft.tags.length > 0 && (
                    <p className="text-xs text-[var(--text-secondary)]">{draft.tags.map((tag) => `#${tag}`).join(' ')}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={importing || selectedCount === 0}
            onClick={() => void handleImport()}
            className="btn btn-primary self-start"
          >
            {importing ? t.importExport.importing : t.importExport.importButton(selectedCount)}
          </button>
        </div>
      )}
    </div>
  );
}
