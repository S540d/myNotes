interface TagFilterBarProps {
  tags: { name: string; noteCount: number }[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export function TagFilterBar({ tags, selected, onToggle }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {tags.map((tag) => {
        const active = selected.includes(tag.name);
        return (
          <button
            key={tag.name}
            type="button"
            onClick={() => onToggle(tag.name)}
            className={`chip ${active ? 'chip-active' : ''}`}
          >
            #{tag.name} <span className="opacity-60">({tag.noteCount})</span>
          </button>
        );
      })}
    </div>
  );
}
