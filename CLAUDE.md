# myNotes

A private, provider-independent journal PWA. Notes live locally on the
device (IndexedDB via Dexie) and are the source of truth; WebDAV sync to
the user's own NAS is **entirely optional** — the app is fully usable
offline/local-only forever, with no server of any kind required.

## Core principle: local-first, sync-optional

- `src/db/repository.ts` is the only place that writes notes. Every
  mutation (`createNote`, `updateNote`, `deleteNote`, …) writes to Dexie
  and enqueues a `syncQueue` entry unconditionally — sync being
  unconfigured just means that queue is never drained, which is harmless.
- Client-side passphrase encryption (`src/crypto/`) is independent of
  WebDAV. A vault can be set up with no NAS URL at all — see
  `SyncPage.tsx`'s `hasWebdav` branch. Don't reintroduce a hard dependency
  between "set up encryption" and "have a WebDAV connection configured";
  that was a real usability bug (see PR that touched `SyncPage.tsx` /
  `newPassphraseSetupLocal`) and regressing it would block anyone who
  wants encrypted notes without a NAS.
- `navigator.storage.persist()` is requested once at startup in
  `main.tsx` regardless of sync state, since local storage durability
  matters most for people *not* syncing to a NAS.
- Import/export (`src/export/`, `src/importers/`) is the backup path for
  local-only users — keep it working without any network config.

## Architecture

```
React UI ⇄ hooks/repository ⇄ IndexedDB (Dexie, source of truth on-device)
                                    ⇅
                            Sync Engine (Outbox, Push/Pull, conflicts) — optional
                                    ⇅
                            Crypto Layer (AES-GCM, PBKDF2 from passphrase) — optional, NAS-independent
                                    ⇅
                            WebDAV Client → NAS (HTTPS: PROPFIND/GET/PUT/DELETE) — optional
Service Worker (Workbox) — app-shell cache, offline fallback
```

### Data model (Dexie, `src/db/schema.ts`)

- `notes`: `id` (UUID v4), `title`, `bodyMarkdown`, `entryDate` (journal
  date, distinct from system timestamps), `tags: string[]`, `createdAt`,
  `updatedAt`, `version` (conflict tiebreaker), `encrypted: boolean`,
  `deleted` (tombstone flag), `remoteEtag`, `syncState`.
- `tags`: registry/autocomplete + hierarchy (parent/child).
- `syncQueue`: outbox for push operations.
- `settings`: WebDAV config (plaintext fallback), encryption vault record.

### NAS file layout (when sync is configured)

One file per note (not a monolith — enables ETag-based incremental sync):

```
/myNotes/
  manifest.json
  notes/<uuid>.json      # plaintext or crypto envelope
  tombstones/<uuid>.json # delete markers for sync propagation
```

Filenames are UUIDs, never title/date, so the file listing itself leaks
nothing even with encryption off.

### Crypto envelope (`encrypted: true`)

`id`, `updatedAt`, `version`, `encrypted`, KDF params and `iv` stay in the
clear (needed for sync bookkeeping without decrypting); `title`,
`bodyMarkdown`, `entryDate`, `tags` are encrypted together as one AES-GCM
JSON blob. The vault (`src/crypto/credentialVault.ts`) also
passphrase-encrypts the WebDAV credentials themselves when one is saved.

## Tech stack

React 19 + Vite (TypeScript) · Dexie.js (IndexedDB) · `vite-plugin-pwa`
(Workbox, `injectManifest`) · CodeMirror 6 · React Router · Tailwind CSS ·
`webdav` npm package · Web Crypto API (AES-256-GCM, PBKDF2) · FlexSearch ·
`turndown` / `jszip` for import/export.

## Directory structure

```
src/
├── db/         schema.ts, repository.ts — all note/tag mutations go through here
├── sync/       webdavClient.ts, syncEngine.ts, conflictResolver.ts, outbox.ts
├── crypto/     keyDerivation.ts, aesGcm.ts, credentialVault.ts, session.ts
├── search/     FlexSearch integration over decrypted in-memory notes
├── importers/  Importer interface (detect()/parse()) — JSON, Markdown+frontmatter/ZIP,
│               plaintext, Evernote .enex, WordPress WXR
├── export/     exporters.ts — JSON and Markdown-ZIP export
├── components/ NoteEditor, ConflictBanner/ConflictResolutionDialog, PassphraseUnlockScreen, …
├── pages/      HomePage, NotePage, SettingsMenuPage, SyncPage, ImportExportPage
├── hooks/      useSync, useStoragePersistence, useSessionKey, …
├── i18n/       translations.ts — every user-facing string exists in `de` and `en`
└── types/      note.ts
```

docs/ has operational guides that stay current (unlike this file's
snapshot, keep these updated when behavior changes):
- `docs/NAS_SETUP.md` — WebDAV/CORS setup for Synology/QNAP.
- `docs/THREAT_MODEL.md` — what encryption does/doesn't protect against.
- `docs/TESTING.md` — test infra, including the Docker WebDAV integration test.

## Sync engine (when configured)

- **Push**: every local mutation lands atomically in `notes` +
  `syncQueue`. A drain loop (triggers: app foreground, `online` event,
  timer, manual "Sync now") does `PUT` with `If-Match: <remoteEtag>` for
  optimistic concurrency; deletes write a tombstone first, then remove the
  note file.
- **Pull**: `PROPFIND (Depth: 1)` lists all files with ETag/Last-Modified
  — only changed files get a `GET` (incremental, no full rescan).
- **Conflicts**: last-write-wins by default; on a real conflict (both
  sides changed since last sync) the local edit is kept as the working
  copy, the losing remote version is stashed as `conflictShadow` for
  manual resolution (keep local/remote/both) in the UI — no silent data
  loss.
- **No Background Sync API** (unavailable on iOS Safari) — sync only runs
  while the app is open; this is deliberate, not a gap.

## i18n

Every user-facing string lives in `src/i18n/translations.ts` under both
`de` and `en` — when adding or changing UI copy, update both languages in
the same change.

## Commands

```bash
npm install
npm run dev                    # dev server
npm run build                  # tsc -b && vite build
npm run lint                   # oxlint
npm test                       # vitest run
npm run test:watch             # vitest watch mode
npm run test:integration:webdav  # Docker-based WebDAV integration test, see docs/TESTING.md
npm run test:e2e               # Playwright PWA E2E
```
