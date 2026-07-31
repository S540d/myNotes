import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotes, useTags } from '../hooks/useNotes';
import { NoteCard } from '../components/NoteCard';
import { SearchBar } from '../components/SearchBar';
import { TagFilterBar } from '../components/TagFilterBar';

export function HomePage() {
  const notes = useNotes();
  const tags = useTags();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!notes) return undefined;
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        !q || note.title.toLowerCase().includes(q) || note.bodyMarkdown.toLowerCase().includes(q);
      const matchesTags = selectedTags.every((tag) => note.tags.includes(tag));
      return matchesQuery && matchesTags;
    });
  }, [notes, query, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">myNotes</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Sync
          </Link>
          <Link
            to="/note/new"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Neuer Eintrag
          </Link>
        </div>
      </header>

      <SearchBar value={query} onChange={setQuery} placeholder="Einträge durchsuchen…" />
      {tags && <TagFilterBar tags={tags} selected={selectedTags} onToggle={toggleTag} />}

      <div className="mt-4 flex flex-col gap-3">
        {filtered === undefined && <p className="text-slate-500">Lade…</p>}
        {filtered && filtered.length === 0 && (
          <p className="mt-8 text-center text-slate-500">
            Noch keine Einträge. Leg mit „+ Neuer Eintrag“ los.
          </p>
        )}
        {filtered?.map((note) => <NoteCard key={note.id} note={note} />)}
      </div>
    </div>
  );
}
