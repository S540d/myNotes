# myNotes

A private, provider-independent journal as a PWA. Long, diary-style entries
(including travel logs) are stored locally on the device and optionally
synced with your own NAS via WebDAV — no cloud provider, no server of your
own to run.

**App:** https://s540d.github.io/myNotes/

This is a demo instance without a preconfigured NAS — it shows the app and
runs fully offline in the browser/as an installed PWA. For the actual use
case (a private, synced journal), install the app yourself and connect it
to your own NAS via the WebDAV sync built into the Settings page.

## Status

All originally planned implementation phases are done:

The original architecture and design plan (data model, sync engine,
encryption design) remains available as a reference in
[`docs/PLAN.md`](docs/PLAN.md).

## Goals

- **Provider-independent**: no dependency on a cloud provider, all data
  stays on your own NAS.
- **Maximum privacy**: optional end-to-end encryption where the NAS only
  ever sees ciphertext.
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
