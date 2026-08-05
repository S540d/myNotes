# myNotes

**STOPPED**: unterschied zu joplin gering (myNotes: browserbasiert, Joplin zur Installation). 
substanzieller Trade-off für CORS in dieser Lösung, weil Browser nicht persistent speichert
weiterführung zu entscheiden. 

A private, provider-independent journal as a PWA. Long, diary-style entries
(including travel logs) are stored locally on the device — no cloud
provider, no server of your own to run. Syncing with your own NAS via
WebDAV, and passphrase encryption, are both entirely optional and
independent of each other: you can use myNotes purely local, encrypt it
without ever setting up a NAS, sync without encryption, or both.

**App:** https://s540d.github.io/myNotes/

This is a demo instance without a preconfigured NAS — it shows the app and
runs fully offline in the browser/as an installed PWA. Install it and use
it as-is for a private, local-only journal, or connect it to your own NAS
via the WebDAV sync built into the Settings page for multi-device sync.

## Status

All originally planned implementation phases are done. The architecture
(data model, sync engine, encryption design) is documented in
[`CLAUDE.md`](CLAUDE.md).

## Goals

- **Works fully without a NAS**: local storage and local encryption are
  first-class, not a fallback — NAS sync is opt-in on top.
- **Provider-independent**: no dependency on a cloud provider; if you do
  sync, data stays on your own NAS.
- **Maximum privacy**: optional end-to-end encryption where, if synced,
  the NAS only ever sees ciphertext.
- **Simple**: deliberately reduced feature set for single-user journaling,
  loosely inspired by WordPress but without its complexity.
- **A home for many thoughts and travel logs**: journal structure with
  date, tags, and search, built for years of entries.

## Tech stack

React 18 + Vite (TypeScript) · Dexie.js (IndexedDB) · `vite-plugin-pwa`
(Workbox) · CodeMirror 6 · React Router · Tailwind CSS · `webdav` ·
Web Crypto API (AES-GCM, PBKDF2) · FlexSearch · `turndown` / `jszip` for
import/export.

## Development

```bash
npm install
npm run dev      # dev server
npm run build     # production build (incl. type check)
npm run lint      # oxlint
npm test          # Vitest unit tests
npm run test:e2e  # Playwright PWA E2E (first run `npx playwright install chromium`)
```

Details on the test infrastructure (including the optional WebDAV
integration test via Docker):
[`docs/TESTING.md`](docs/TESTING.md).

The app is built as a PWA and runs installed both on Android Chrome and,
via "Add to Home Screen", on iOS Safari.

## NAS sync setup

To connect myNotes to your own NAS via WebDAV (including the CORS
configuration required for browser-based WebDAV access), see
[`docs/NAS_SETUP.md`](docs/NAS_SETUP.md).

## Deployment

The `main` branch is automatically built and published to GitHub Pages via
GitHub Actions (`.github/workflows/deploy-pages.yml`). One-time
prerequisite (done by the repo owner): set the Pages source to "GitHub
Actions" in the repo settings.

To deploy on your own NAS/web server instead of GitHub Pages: run
`npm run build -- --base=/` (or your desired subpath) and copy the contents
of `dist/` there.
