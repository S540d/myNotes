import { useState } from 'react';
import { suggestMatchingTags, suggestTagsFromText } from '../utils/tagSuggestions';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Every known tag name, for autocomplete + text-based suggestions. */
  knownTags: string[];
  /** Note body/title, scanned for tags the user probably forgot to add. */
  suggestFromText?: string;
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase();
}

export function TagInput({ tags, onChange, knownTags, suggestFromText }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = normalize(raw);
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const autocompleteSuggestions = suggestMatchingTags(draft, knownTags, tags);
  const textSuggestions = suggestFromText ? suggestTagsFromText(suggestFromText, knownTags, tags) : [];

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="field-input flex flex-1 flex-wrap items-center gap-1 text-sm">
        {tags.map((tag) => (
          <span key={tag} className="chip chip-active flex items-center gap-1">
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Tag ${tag} entfernen`}
              className="opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={tags.length === 0 ? 'Tags hinzufügen…' : ''}
          className="min-w-[6rem] flex-1 border-none bg-transparent outline-none"
        />
      </div>

      {autocompleteSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {autocompleteSuggestions.map((tag) => (
            <button key={tag} type="button" onClick={() => addTag(tag)} className="chip">
              #{tag}
            </button>
          ))}
        </div>
      )}

      {textSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--text-secondary)]">
          Vorschlag aus dem Text:
          {textSuggestions.map((tag) => (
            <button key={tag} type="button" onClick={() => addTag(tag)} className="chip">
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
