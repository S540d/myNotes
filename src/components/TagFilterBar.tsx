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
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              active
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            #{tag.name} <span className="opacity-60">({tag.noteCount})</span>
          </button>
        );
      })}
    </div>
  );
}
