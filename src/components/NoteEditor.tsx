import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const editorTheme = EditorView.theme({
  '&': { fontSize: '1rem' },
  '&, .cm-content, .cm-scroller': {
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  },
  '.cm-content': { lineHeight: '1.6' },
  '.cm-scroller': { overflow: 'auto' },
});

export function NoteEditor({ value, onChange }: NoteEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
      placeholder="Schreib deinen Eintrag…"
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      className="min-h-[50vh] rounded-lg border border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  );
}
