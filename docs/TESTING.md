# Testing

Companion infra for [Issue #8](https://github.com/S540d/myNotes/issues/8); see `docs/PLAN.md` for the overall architecture these tests exercise.

## Unit tests (Vitest)

```sh
npm test          # single run
npm run test:watch
```

Runs against `fake-indexeddb` (no browser needed) and covers:

- `src/crypto/`: AES-GCM roundtrip + tamper/wrong-key failure, PBKDF2 key derivation, note envelope encrypt/decrypt roundtrip, envelope format stability, fail-closed on wrong passphrase.
- `src/sync/conflictResolver.test.ts`: last-write-wins decision table.
- `src/sync/outbox.test.ts`: outbox collapsing, retry bookkeeping.
- `src/sync/syncEngine.test.ts`: clean push, clean pull, a simultaneous two-device edit conflict, a transient push failure + reconnect retry, and tombstone propagation in both directions — all against a mocked `webdavClient` (no network).

## WebDAV integration test (real server, opt-in)

Exercises `src/sync/webdavClient.ts` (PROPFIND/GET/PUT/DELETE, `If-Match` preconditions, CORS) against a real WebDAV server instead of a mock, using [`hacdias/webdav`](https://github.com/hacdias/webdav) via Docker:

```sh
docker compose -f docker-compose.webdav.yml up -d
npm run test:integration:webdav
docker compose -f docker-compose.webdav.yml down
```

`test/webdav/config.yml` configures permissive CORS analogous to the real NAS setup. The suite auto-skips (rather than failing) if no server is reachable at `http://localhost:6065`, so it's safe to leave out of the default `npm test` / CI run.

## PWA E2E (Playwright)

```sh
npx playwright install chromium   # once
npm run test:e2e
```

`e2e/pwa-install-offline.spec.ts` builds the app and serves it via `vite preview`, emulating an Android Chrome device (Pixel 7) to check:

- the web app manifest is installable (`display: standalone`, icons present),
- the service worker precaches the app shell and activates,
- the app still renders and is usable with the network fully cut (`context.setOffline(true)`),
- a note can be created while offline (local-first CRUD).

iOS Safari's PWA specifics (storage eviction, standalone-mode quirks) aren't reliably reproducible under Playwright's WebKit engine and remain a manual test on a real/simulated device, per `docs/PLAN.md`.

## Fixtures

`test/fixtures/` holds sample inputs (myNotes JSON, Markdown+frontmatter, plaintext, `.enex`, WXR) for the importer/exporter regression tests that will land with Phase 5 ([Issue #6](https://github.com/S540d/myNotes/issues/6)).

## CI

`.github/workflows/ci.yml` runs lint + build + `npm test` on every push/PR, plus a separate job installing Chromium and running the Playwright suite.
