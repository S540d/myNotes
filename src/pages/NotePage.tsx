import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNote } from '../hooks/useNotes';
import { createNote, deleteNote, updateNote } from '../db/repository';
import { NoteEditor } from '../components/NoteEditor';

const AUTOSAVE_DELAY_MS = 800;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useNote(isNew ? undefined : id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [tagsInput, setTagsInput] = useState('');
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNextAutosave = useRef(isNew);

  useEffect(() => {
    if (existing && !loaded) {
      setTitle(existing.title);
      setEntryDate(existing.entryDate);
      setTagsInput(existing.tags.join(', '));
      setBody(existing.bodyMarkdown);
      setLoaded(true);
      skipNextAutosave.current = true;
    }
  }, [existing, loaded]);

  const parseTags = () =>
    tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const handleSave = async () => {
    const draft = { title, bodyMarkdown: body, entryDate, tags: parseTags() };
    if (isNew) {
      const note = await createNote(draft);
      navigate(`/note/${note.id}`, { replace: true });
    } else if (id) {
      await updateNote(id, draft);
    }
  };

  // Debounced autosave: skip the run right after initial load / creation so we
  // don't immediately re-save unchanged data or create a note before the user typed anything.
  useEffect(() => {
    if (!loaded) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (isNew && !title && !body) return;

    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void handleSave();
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, entryDate, tagsInput, body, loaded]);

  if (!isNew && !loaded) {
    return <p className="p-6 text-slate-500">Lade…</p>;
  }

  const handleDelete = async () => {
    if (!id || isNew) return;
    if (!confirm('Diesen Eintrag wirklich löschen?')) return;
    await deleteNote(id);
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        ← Zurück
      </button>

      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Titel"
        className="w-full border-none bg-transparent text-2xl font-bold text-slate-900 outline-none dark:text-slate-50"
      />

      <div className="mt-2 flex flex-wrap gap-3">
        <input
          type="date"
          value={entryDate}
          onChange={(event) => setEntryDate(event.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="Tags, per Komma getrennt"
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="mt-4">
        <NoteEditor
          value={body}
          onChange={(value) => setBody(value)}
        />
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Speichern
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
