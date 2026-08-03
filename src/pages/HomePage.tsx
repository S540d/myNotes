import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotes, useTags } from '../hooks/useNotes';
import { useSearch } from '../hooks/useSearch';
import { NoteCard } from '../components/NoteCard';
import { SearchBar } from '../components/SearchBar';
import { TagFilterBar } from '../components/TagFilterBar';
import { OnThisDay } from '../components/OnThisDay';
import { ConflictBanner } from '../components/ConflictBanner';
import { useI18n } from '../i18n/I18nContext';

export function HomePage() {
  const { t } = useI18n();
  const notes = useNotes();
  const tags = useTags();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filtered = useSearch(notes, query, selectedTags);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((existing) => existing !== tag) : [...current, tag],
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">myNotes</h1>
        <div className="flex items-center gap-2">
          <Link to="/settings" className="btn btn-ghost">
            {t.home.syncLink}
          </Link>
          <Link to="/note/new" className="btn btn-primary">
            {t.home.newEntry}
          </Link>
        </div>
      </header>

      {notes && <ConflictBanner notes={notes} />}
      {notes && <OnThisDay notes={notes} />}

      <SearchBar value={query} onChange={setQuery} placeholder={t.home.searchPlaceholder} />
      {tags && <TagFilterBar tags={tags} selected={selectedTags} onToggle={toggleTag} />}

      <div className="mt-4 flex flex-col gap-3">
        {filtered === undefined && <p className="text-[var(--text-secondary)]">{t.common.loading}</p>}
        {filtered && filtered.length === 0 && (
          <p className="mt-8 text-center text-[var(--text-secondary)]">{t.home.emptyState}</p>
        )}
        {filtered?.map((note) => <NoteCard key={note.id} note={note} />)}
      </div>
    </div>
  );
}
