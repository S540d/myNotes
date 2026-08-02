# test/fixtures

Sample input files for importer/exporter regression tests (Phase 5, [Issue #6](https://github.com/S540d/myNotes/issues/6)).

| File | Format | Purpose |
|---|---|---|
| `myNotes-backup.json` | myNotes' own JSON export | lossless backup/re-import roundtrip |
| `note-with-frontmatter.md` | Markdown + YAML frontmatter | Markdown importer |
| `plain-note.txt` | Plaintext | Plaintext importer (no metadata, title = filename/first line) |
| `evernote-export.enex` | Evernote `.enex` | ENEX importer |
| `wordpress-export.xml` | WordPress WXR | WXR importer |

Each fixture intentionally includes: umlauts/emoji (encoding correctness), a multi-tag entry, and at least one edge case (empty body, missing optional field) where the format allows it.
