import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNote, useNotes, useTags } from '../hooks/useNotes';
import { useSimilarNotes } from '../hooks/useSearch';
import { createNote, deleteNote, updateNote } from '../db/repository';
import { NoteEditor } from '../components/NoteEditor';
import { TagInput } from '../components/TagInput';
import { SimilarNotes } from '../components/SimilarNotes';
import { TemplatePicker } from '../components/TemplatePicker';
import { suggestTitleFromBody } from '../utils/autoTitle';

const AUTOSAVE_DELAY_MS = 800;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useNote(isNew ? undefined : id);
  const allTags = useTags();
  const allNotes = useNotes();
  const similarNotes = useSimilarNotes(existing, allNotes);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipNextAutosave = useRef(isNew);

  useEffect(() => {
    if (existing && !loaded) {
      setTitle(existing.title);
      setEntryDate(existing.entryDate);
      setTags(existing.tags);
      setBody(existing.bodyMarkdown);
      setLoaded(true);
      skipNextAutosave.current = true;
    }
  }, [existing, loaded]);

  const handleSave = async () => {
    const draft = { title, bodyMarkdown: body, entryDate, tags };
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
  }, [title, entryDate, tags, body, loaded]);

  if (!isNew && !loaded) {
    return <p className="p-6 text-[var(--text-secondary)]">Lade…</p>;
  }

  const titleSuggestion = !title.trim() ? suggestTitleFromBody(body) : '';

  const handleDelete = async () => {
    if (!id || isNew) return;
    if (!confirm('Diesen Eintrag wirklich löschen?')) return;
    await deleteNote(id);
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button type="button" onClick={() => navigate('/')} className="btn btn-ghost mb-4 !px-0">
        ← Zurück
      </button>

      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Titel"
        className="w-full border-none bg-transparent text-2xl font-bold text-[var(--text-primary)] outline-none"
      />
      {titleSuggestion && (
        <button
          type="button"
          onClick={() => setTitle(titleSuggestion)}
          className="mt-1 block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Titel übernehmen: „{titleSuggestion}“
        </button>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <input
          type="date"
          value={entryDate}
          onChange={(event) => setEntryDate(event.target.value)}
          className="field-input w-auto text-sm"
        />
        <TagInput
          tags={tags}
          onChange={setTags}
          knownTags={(allTags ?? []).map((t) => t.name)}
          suggestFromText={`${title} ${body}`}
        />
      </div>

      {isNew && !body && <TemplatePicker onPick={setBody} />}

      <div className="mt-4">
        <NoteEditor
          value={body}
          onChange={(value) => setBody(value)}
        />
      </div>

      {!isNew && <SimilarNotes notes={similarNotes} />}

      <div className="mt-4 flex justify-between">
        <button type="button" onClick={handleSave} className="btn btn-primary">
          Speichern
        </button>
        {!isNew && (
          <button type="button" onClick={handleDelete} className="btn btn-danger">
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
