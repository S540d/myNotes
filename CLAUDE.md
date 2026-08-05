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
  `syncQueue`. A drain loop does `PUT` with `If-Match: <remoteEtag>` for
  optimistic concurrency; deletes write a tombstone first, then remove the
  note file.
- **Pull**: `PROPFIND (Depth: 1)` lists all files with ETag/Last-Modified
  — only changed files get a `GET` (incremental, no full rescan).
- **Conflicts**: last-write-wins by default; on a real conflict (both
  sides changed since last sync) the local edit is kept as the working
  copy, the losing remote version is stashed as `conflictShadow` for
  manual resolution (keep local/remote/both) in the UI — no silent data
  loss.
- **Trigger — current state vs. plan**: today the drain loop only runs on
  the manual "Jetzt synchronisieren" button (`useSync().sync()` in
  `src/hooks/useSync.ts`, wired up in `SyncPage.tsx`). Automatic triggers
  (app-foreground via `visibilitychange`, the `online` event, a periodic
  timer) are the intended target behavior but are **not implemented** —
  don't assume `useSync.ts` already does this; it doesn't. See the open
  decision below before building it.
- **No Background Sync API** (unavailable on iOS Safari) — sync only runs
  while the app is open; this is deliberate, not a gap.

## Open decision: is myNotes' own WebDAV sync still worth finishing? (Issue #31)

Status as of 2026-08-05, kept here so a future session can pick this up
without re-deriving it:

- **The blocker isn't the NAS config, it's the browser.** Issue #31's
  original diagnosis (CORS reverse-proxy in front of Synology's WebDAV)
  is correct but only half the picture. myNotes runs as a page in a real
  browser tab (even installed as a PWA, it's still a browser rendering
  context), so the browser's CORS enforcement applies to every `fetch()`
  in `src/sync/webdavClient.ts` regardless of PWA install state. Compare
  Joplin, which the user already runs successfully against the same NAS
  at `http://192.168.1.79:5005/home/Drive/joplin/` with **no CORS
  workaround at all** — that works because Joplin's sync client runs in a
  native Electron/mobile process, not a browser sandbox, so CORS never
  applies to it in the first place. A CORS reverse-proxy in front of the
  NAS's WebDAV (`docs/NAS_SETUP.md`) is still the only way to make a
  *browser-based* client like myNotes work; there is no shortcut that
  copies Joplin's setup as-is.
- **Directory model**: independent of the CORS question, the target
  directory should be a dedicated shared folder with its own
  WebDAV-scoped user (`docs/NAS_SETUP.md` steps 1.3/1.4) — not an
  existing personal home directory (Issue #31's original target path,
  `/volume1/homes/sven/Drive/myNotes`, was a home-directory path and
  should be moved to a dedicated share).
- **Open question, not yet decided**: the user already has a working
  WebDAV sync via Joplin against this NAS. Whether it's still worth
  standing up the CORS reverse-proxy for myNotes specifically (vs.
  treating myNotes as local-only/import-export-only for now, or
  eventually wrapping it as a native app shell to sidestep CORS the way
  Joplin does) is **open** — no decision has been made either way. Don't
  assume NAS sync is "the next thing to finish"; check with the user
  first if picking this back up.

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

<!-- GLOBAL POLICY:START -->
## [GLOBAL POLICY]

> Automatisch synchronisiert aus project-templates (Issue #7). Nicht manuell editieren –
> Änderungen hier werden beim nächsten Sync überschrieben. Quelle anpassen statt lokal.

- PRs immer gegen `testing`, nie direkt gegen `staging` oder `main`
- Merge auf `main` nur mit expliziter schriftlicher Freigabe
- `--delete-branch` nur für Feature-Branches (nie staging/testing)
- **Lokales Branch-Cleanup:** `main` und `testing` NIE löschen — auch nicht beim Bulk-Delete verwaister `[gone]`-Branches. Ein fehlender `origin/main`/`origin/testing` ist ein **wiederherzustellender Defekt** (lokal behalten, nach origin zurückpushen), kein Aufräum-Signal.
- `--no-verify` nur auf explizite Bitte
- **Vor jedem Push: lokale Tests ausführen** (`npm test` bzw. projektspezifischer Test-Befehl) – kein Push ohne grüne lokale Tests
- **Kein Merge bei CI-Fail** – Branch Protection erzwingt das technisch; nie mit `--admin` umgehen außer auf explizite Bitte

## [ANDROID BUILD – PFLICHTREGELN]

- **Git-Tag** nach jedem Play-Store-Upload setzen: `git tag vX.Y.Z && git push origin vX.Y.Z` – der Tag markiert den tatsächlich veröffentlichten Stand und dient als Changelog-Baseline für den nächsten Build
- **EAS Local Build (DrawFromMemory):** Workingdir vor jedem Build leeren: `rm -rf ~/tmp/eas-build && mkdir -p ~/tmp/eas-build` – ein nicht-leeres Verzeichnis bricht den Build sofort ab
- **Disk-Check vor EAS Build:** Skia-Libraries benötigen ~5–8 GB. Bei < 5 GB frei: `npm cache clean --force && rm -rf ~/.npm/_npx` (~13 GB, sicher löschbar)
- **JAVA_HOME** für EAS/Expo-Builds explizit auf Android Studio JBR setzen: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- **Gradle-Lock nach Absturz:** Bei "Cannot lock file hash cache"-Fehler Daemons stoppen: `pkill -f GradleDaemon`, dann Workingdir leeren und neu starten
- **AAB-Archiv:** Gebaute Release-AABs in einem **gitignored** `aab-archive/`-Verzeichnis im Repo-Root ablegen (in `.gitignore` aufnehmen – AABs sind 3–110 MB und gehören nie in die Git-History). Benennung: `<Projekt>-vX.Y.Z-vc<versionCode>-YYYY-MM-DD.aab`. **Retention: max. 2 Dateien** (aktuelles Release + ein Vorgänger für schnelles Rollback); ältere AABs löschen. Der Git-Tag `vX.Y.Z` ist die eigentliche Release-Baseline – ältere AABs lassen sich daraus jederzeit neu bauen.

## [CI – CACHE-CLEANUP]

- **Cache-Cleanup-Workflow** (`.github/workflows/cache-cleanup.yml`) in jedem Repo mit GitHub-Actions-Caches: löscht wöchentlich (So 03:00 UTC) bzw. on-demand alle Action-Caches älter als der jeweils letzte Lauf. GitHub-Limit ist 10 GB pro Repo – ohne Cleanup laufen Build-Caches (node_modules, Gradle, Expo) voll und verdrängen frische Einträge. Vorlage: `cache-cleanup.yml` in project-templates.
<!-- GLOBAL POLICY:END -->
