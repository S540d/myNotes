import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { useI18n } from '../i18n/I18nContext';

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '1rem',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text-primary)',
  },
  '&, .cm-content, .cm-scroller': {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  },
  '.cm-content': { lineHeight: '1.6', caretColor: 'var(--text-primary)' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': { backgroundColor: 'var(--card-bg)', color: 'var(--text-light)', border: 'none' },
  '.cm-placeholder': { color: 'var(--text-light)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
});

export function NoteEditor({ value, onChange }: NoteEditorProps) {
  const { t } = useI18n();
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
      placeholder={t.note.bodyPlaceholder}
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      className="field-input min-h-[50vh]"
    />
  );
}
