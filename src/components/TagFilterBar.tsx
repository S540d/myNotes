import { useState } from 'react';
import type { TagTreeNode } from '../utils/tagTree';
import { useI18n } from '../i18n/I18nContext';

interface TagFilterBarProps {
  tree: TagTreeNode[];
  selected: string[];
  onToggle: (tag: string) => void;
  onSetParent: (name: string, parent: string | undefined) => void;
}

function flattenNames(nodes: TagTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.name, ...flattenNames(node.children)]);
}

function TagRow({
  node,
  depth,
  selected,
  onToggle,
  onSetParent,
  allTagNames,
  editing,
  setEditing,
}: {
  node: TagTreeNode;
  depth: number;
  selected: string[];
  onToggle: (tag: string) => void;
  onSetParent: (name: string, parent: string | undefined) => void;
  allTagNames: string[];
  editing: string | undefined;
  setEditing: (name: string | undefined) => void;
}) {
  const { t } = useI18n();
  const active = selected.includes(node.name);
  const isEditing = editing === node.name;
  const descendantNames = new Set(flattenNames(node.children));
  const parentOptions = allTagNames.filter((name) => name !== node.name && !descendantNames.has(name));

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggle(node.name)}
          className={`chip ${active ? 'chip-active' : ''}`}
        >
          #{node.name} <span className="opacity-60">({node.noteCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setEditing(isEditing ? undefined : node.name)}
          aria-label={t.tagFilterBar.editParentAria(node.name)}
          className="text-xs text-[var(--text-light)] hover:text-[var(--text-primary)]"
        >
          ⚙
        </button>
      </div>

      {isEditing && (
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {t.tagFilterBar.parentLabel}
          <input
            type="text"
            list={`parent-options-${node.name}`}
            defaultValue={node.parent ?? ''}
            placeholder={t.tagFilterBar.noParent}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              const value = event.currentTarget.value.trim().toLowerCase();
              onSetParent(node.name, value || undefined);
              setEditing(undefined);
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim().toLowerCase();
              onSetParent(node.name, value || undefined);
              setEditing(undefined);
            }}
            autoFocus
            className="field-input w-auto py-1 text-xs"
          />
          <datalist id={`parent-options-${node.name}`}>
            {parentOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}

      {node.children.map((child) => (
        <TagRow
          key={child.name}
          node={child}
          depth={depth + 1}
          selected={selected}
          onToggle={onToggle}
          onSetParent={onSetParent}
          allTagNames={allTagNames}
          editing={editing}
          setEditing={setEditing}
        />
      ))}
    </div>
  );
}

export function TagFilterBar({ tree, selected, onToggle, onSetParent }: TagFilterBarProps) {
  const [editing, setEditing] = useState<string>();
  if (tree.length === 0) return null;

  const allTagNames = flattenNames(tree);

  return (
    <div className="flex flex-col gap-1 py-2">
      {tree.map((node) => (
        <TagRow
          key={node.name}
          node={node}
          depth={0}
          selected={selected}
          onToggle={onToggle}
          onSetParent={onSetParent}
          allTagNames={allTagNames}
          editing={editing}
          setEditing={setEditing}
        />
      ))}
    </div>
  );
}
