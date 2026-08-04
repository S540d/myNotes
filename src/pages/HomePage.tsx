import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotes, useTags, useTagTree } from '../hooks/useNotes';
import { useSearch } from '../hooks/useSearch';
import { setTagParent } from '../db/repository';
import { groupNotesByTag } from '../utils/groupNotesByTag';
import { NoteCard } from '../components/NoteCard';
import { SearchBar } from '../components/SearchBar';
import { TagFilterBar } from '../components/TagFilterBar';
import { OnThisDay } from '../components/OnThisDay';
import { ConflictBanner } from '../components/ConflictBanner';
import { useI18n } from '../i18n/I18nContext';

type GroupBy = 'date' | 'tag';

export function HomePage() {
  const { t } = useI18n();
  const notes = useNotes();
  const tags = useTags();
  const tagTree = useTagTree();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('date');

  const filtered = useSearch(notes, query, selectedTags, tags ?? []);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((existing) => existing !== tag) : [...current, tag],
    );
  };

  const handleSetParent = (name: string, parent: string | undefined) => {
    void setTagParent(name, parent).catch((err) => {
      console.error('Failed to set tag parent', err);
    });
  };

  const tagGroups = groupBy === 'tag' && filtered ? groupNotesByTag(filtered, tagTree ?? []) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">myNotes</h1>
        <div className="flex items-center gap-2">
          <Link to="/settings" aria-label={t.home.settingsAria} title={t.home.settingsAria} className="btn btn-ghost !px-3 text-lg leading-none">
            &#8942;
          </Link>
          <Link to="/note/new" className="btn btn-primary">
            {t.home.newEntry}
          </Link>
        </div>
      </header>

      {notes && <ConflictBanner notes={notes} />}
      {notes && <OnThisDay notes={notes} />}

      <SearchBar value={query} onChange={setQuery} placeholder={t.home.searchPlaceholder} />
      {tagTree && (
        <TagFilterBar tree={tagTree} selected={selectedTags} onToggle={toggleTag} onSetParent={handleSetParent} />
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setGroupBy('date')}
          className={`chip ${groupBy === 'date' ? 'chip-active' : ''}`}
        >
          {t.homeGrouping.groupByDate}
        </button>
        <button
          type="button"
          onClick={() => setGroupBy('tag')}
          className={`chip ${groupBy === 'tag' ? 'chip-active' : ''}`}
        >
          {t.homeGrouping.groupByTag}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered === undefined && <p className="text-[var(--text-secondary)]">{t.common.loading}</p>}
        {filtered && filtered.length === 0 && (
          <p className="mt-8 text-center text-[var(--text-secondary)]">{t.home.emptyState}</p>
        )}

        {tagGroups
          ? tagGroups.map((group) => (
              <div key={group.tagName ?? '\0no-tag'} style={{ marginLeft: group.depth * 16 }}>
                <h2 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                  {group.tagName ? `#${group.tagName}` : t.homeGrouping.noTagGroup}
                </h2>
                <div className="flex flex-col gap-3">
                  {group.notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            ))
          : filtered?.map((note) => <NoteCard key={note.id} note={note} />)}
      </div>
    </div>
  );
}
