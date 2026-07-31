# myNotes — Journal-PWA mit NAS-Sync

## Kontext

Das Repository ist aktuell leer (nur `LICENSE` + 1-Zeilen-`README.md`). Ziel ist eine neue, von Grund auf entwickelte Notiz-/Tagebuch-App, die:
- lange, journal-artige Einträge (Tagebuch, Reiseberichte) verwaltet,
- ausschließlich mit dem eigenen NAS synchronisiert (kein Cloud-Anbieter, kein eigener Server) — **Betreiberunabhängigkeit**,
- offline vollständig nutzbar ist,
- optional client-seitig verschlüsselt werden kann (**maximale Privatsphäre**, Zero-Knowledge gegenüber dem NAS),
- als PWA sowohl auf Android als auch auf iOS Safari ("Zum Home-Bildschirm") läuft,
- **simpel** bedienbar bleibt (WordPress als lose Inspiration, aber deutlich reduzierter Funktionsumfang, Single-User),
- Export/Import mit flexiblen Importfiltern sowie Volltext- und Schlagwortsuche bietet.

Getroffene Architekturentscheidungen (mit Nutzer abgestimmt): **WebDAV** als Sync-Protokoll (kein eigener Backend-Server), **React + Vite**, **client-seitige Passphrase-Verschlüsselung** via Web Crypto API (AES-GCM), gleichermaßen funktionsfähig auf Android Chrome und iOS Safari.

## Architektur-Überblick

```
React UI ⇄ Data Layer/Hooks ⇄ IndexedDB (Dexie, "source of truth" on-device)
                                      ⇅
                              Sync Engine (Outbox, Push/Pull, Konfliktauflösung)
                                      ⇅
                              Crypto Layer (AES-GCM, PBKDF2-Key aus Passphrase)
                                      ⇅
                              WebDAV Client → NAS (HTTPS: PROPFIND/GET/PUT/DELETE)
Service Worker (Workbox) — App-Shell-Cache, Offline-Fallback
```

Prinzip: Die UI liest/schreibt ausschließlich gegen IndexedDB. Die Sync Engine läuft als entkoppelter Hintergrundprozess und gleicht IndexedDB mit dem WebDAV-Speicher ab — das hält die App jederzeit responsiv und offline-fähig.

## Datenmodell

**Note (Dexie-Tabelle `notes`):**
`id` (UUID v4), `title`, `bodyMarkdown`, `entryDate` (Journal-Datum, getrennt von System-Timestamps), `tags: string[]`, `createdAt`, `updatedAt`, `version` (Konflikt-Tiebreaker), `encrypted: boolean`, `deleted` (Tombstone-Flag), `remoteEtag`, `syncState`.

Weitere Tabellen: `tags` (Registry/Autocomplete), `syncQueue` (Outbox für Push-Operationen), `settings` (WebDAV-Config, Verschlüsselungs-Salt, Device-ID), optional `searchIndex` (persistenter FlexSearch-Cache).

**NAS-Dateilayout** (ein File pro Notiz, nicht eine Monolith-Datei — ermöglicht ETag-basierte inkrementelle Syncs und vermeidet Kollisionen zwischen unabhängigen Notizen):
```
/myNotes/
  manifest.json
  notes/<uuid>.json      # Klartext oder Crypto-Envelope
  tombstones/<uuid>.json # Lösch-Marker für Sync-Propagation
```
Dateinamen sind UUIDs, niemals Titel/Datum — verhindert Informationslecks über die Dateiliste selbst bei aktivierter Verschlüsselung.

**Crypto-Envelope** (wenn `encrypted: true`): `id`, `updatedAt`, `version`, `encrypted`, `kdf`-Parameter und `iv` bleiben unverschlüsselt (nötig für Sync-Mechanik ohne Entschlüsselung); `title`, `bodyMarkdown`, `entryDate`, `tags` werden gemeinsam als JSON-Blob mit AES-GCM verschlüsselt.

## Tech-Stack

| Bereich | Wahl |
|---|---|
| Framework | React 18 + Vite (TypeScript) |
| PWA | `vite-plugin-pwa` (Workbox, `injectManifest`-Strategie) |
| Lokale DB | Dexie.js + `dexie-react-hooks` (`useLiveQuery`) |
| WebDAV | `webdav` npm-Paket (Basic/Digest-Auth, custom fetch-Adapter) |
| Crypto | natives `window.crypto.subtle` (AES-GCM 256, PBKDF2-SHA256 ≥210k Iterationen) |
| Editor | CodeMirror 6 (bessere iOS-Touch-Unterstützung als Textarea-Wrapper) |
| Markdown-Rendering | `react-markdown` + `remark-gfm` |
| Volltextsuche | FlexSearch (in-memory Index über entschlüsselte IndexedDB-Inhalte) |
| Routing | `react-router` |
| Styling | Tailwind CSS (schlanker Footprint) |
| Import-Parser | `turndown` (HTML→MD), `jszip`, eigene ENEX-/WXR-Parser |
| Tests | Vitest + React Testing Library, Playwright (Android-PWA-Flows) |

## Sync Engine

- **Push**: jede lokale Mutation landet atomar in `notes` + `syncQueue` (Outbox). Ein Hintergrund-Loop (Trigger: App-Foreground, `online`-Event, Timer, manueller "Jetzt synchronisieren"-Button) drained die Queue: `PUT` mit `If-Match: <remoteEtag>` für optimistische Nebenläufigkeitskontrolle; bei Löschungen zuerst Tombstone schreiben, dann Note-Datei löschen.
- **Pull**: `PROPFIND (Depth: 1)` listet alle Dateien mit ETag/Last-Modified — nur geänderte Dateien werden per `GET` geladen (inkrementell, kein Full-Rescan).
- **Konfliktauflösung**: Last-Write-Wins nach `updatedAt`/`version` als Regelfall; bei echten Konflikten (beide Seiten seit letztem Sync geändert) wird die lokale Version als Arbeitskopie behalten, die unterlegene Remote-Version als Schatten-/Konfliktkopie gesichert und in der UI zur manuellen Auflösung (Diff, "meine/ihre/beide behalten") angeboten — kein stiller Datenverlust.
- **Offline-Queue**: Mutationen gelingen immer sofort lokal; Sync holt bei Konnektivität auf. Kein Background-Sync-API-Einsatz (auf iOS Safari nicht verfügbar) — Sync läuft nur im geöffneten App-Zustand, das wird dem Nutzer transparent kommuniziert.

## Verschlüsselung

- Passphrase → PBKDF2 (nativ, kein WASM nötig) leitet AES-256-GCM-Schlüssel ab; Schlüssel bleibt nur im Speicher (Session), nie persistent gespeichert → Unlock-Screen nach jedem Neustart.
- Verschlüsselt werden Titel, Text, Datum, Tags; Sync-Metadaten bleiben klar (dokumentiertes, akzeptables Trade-off, siehe `THREAT_MODEL.md`).
- Suche arbeitet auf lokal entschlüsselten Daten in IndexedDB (Trust-Boundary = Gerät selbst); FlexSearch-Index wird nie unverschlüsselt aufs NAS geschrieben.
- WebDAV-Zugangsdaten werden ebenfalls über die Passphrase verschlüsselt in IndexedDB abgelegt, nicht im Klartext.
- Verschlüsselung ist global togglebar, mit expliziter "Alle neu verschlüsseln/entschlüsseln"-Aktion; gemischte Zustände (`encrypted`-Flag pro Datei) werden von Sync/Read-Pfad korrekt behandelt.

## Suche & Tags

Tags als normalisierte Strings mit Dexie Multi-Entry-Index (`*tags`), kombinierbar mit Volltextsuche (FlexSearch über Titel/Body). Performance-Ziel: <200ms Suchlatenz bei mehreren tausend synthetischen Notizen auf Mittelklasse-Android-Gerät (Benchmark in Phase 4).

## Import/Export

Export: verlustfreies JSON (Backup/Re-Import) sowie ZIP mit einer Markdown-Datei pro Notiz (YAML-Frontmatter für Metadaten) als portables Format.

Import: Plugin-Architektur (`Importer`-Interface mit `detect()`/`parse()`) für erweiterbare Filter — Start-Set: eigenes JSON, Markdown(+Frontmatter)/ZIP, Plaintext, Evernote `.enex`, WordPress-Export-XML (WXR, passend zur WordPress-Inspiration). Import-Wizard mit Format-Erkennung, Vorschau/Auswahl-Tabelle und Bulk-Insert über denselben Pfad wie normale Notiz-Erstellung (damit der Sync automatisch greift).

## PWA / iOS-Besonderheiten

- `vite-plugin-pwa` mit `injectManifest` für individuelle Offline-Logik; Manifest mit `display: standalone`.
- Pflicht für iOS: echtes `<link rel="apple-touch-icon">`-Tag (Manifest-Icons allein reichen auf iOS Safari nicht), `apple-mobile-web-app-capable`-Meta-Tags.
- iOS kann IndexedDB bei länger nicht geöffneten PWAs evicten: `navigator.storage.persist()` beim Setup anfordern, NAS klar als eigentliche Backup-/Durability-Quelle kommunizieren, IndexedDB nur als schneller lokaler Cache.
- Kein Verlass auf Background-Sync/Web-Push (iOS-Limitierung) — nur Foreground-getriggerter Sync.
- Testmatrix muss "Zum Home-Bildschirm" + Offline-Verhalten nach Force-Quit auf echtem/simuliertem iOS-Gerät explizit abdecken (iOS-Safari-PWA-Verhalten ist in Chrome-DevTools-Emulation nicht zuverlässig testbar).

## Projektstruktur

```
myNotes/
├── docs/ (THREAT_MODEL.md, NAS_SETUP.md — WebDAV/CORS-Anleitung Synology/QNAP)
└── src/
    ├── db/ (schema.ts, repository.ts)
    ├── sync/ (webdavClient.ts, syncEngine.ts, conflictResolver.ts, outbox.ts)
    ├── crypto/ (keyDerivation.ts, encryptNote.ts/decryptNote.ts, credentialVault.ts)
    ├── search/ (indexManager.ts, tagUtils.ts)
    ├── importers/ (types.ts, markdownImporter.ts, jsonImporter.ts, plaintextImporter.ts,
    │               evernoteEnexImporter.ts, wordpressWxrImporter.ts, index.ts-Registry)
    ├── export/ (exporters.ts)
    ├── components/ (NoteEditor, NoteList, TagFilterBar, SearchBar, SyncStatusBadge,
    │                ConflictBanner/ConflictResolutionDialog, PassphraseUnlockScreen)
    ├── pages/ (HomePage, NotePage, SearchPage, SettingsPage, ImportPage)
    ├── hooks/ (useNotes, useSync, useSearch)
    └── types/ (note.ts)
```

## Phasenplan

1. **Scaffolding**: Vite-React-TS-Setup, ESLint/Prettier/Vitest, Routing-Grundgerüst.
2. **Lokale Journal-CRUD + PWA-Shell**: Dexie-`notes`-Tabelle, Editor/Liste, einfache Tag-Filterung, `vite-plugin-pwa`, iOS-Meta-Tags. *Exit: voll offline nutzbare Single-Device-App, installierbar auf Android & iOS.*
3. **WebDAV-Sync**: Settings-Seite, Outbox, Push/Pull, einfache LWW-Konfliktbehandlung, manueller Sync-Button zuerst, danach automatische Trigger. *Exit: zwei Profile/Geräte gegen dieselbe NAS konvergieren nach Sync.*
4. **Verschlüsselung**: Key-Derivation, Unlock-Screen, Crypto-Envelope in Sync integriert, Credential-Vault, globaler Toggle + Bulk-Re-Encrypt. *Exit: NAS-Dateien direkt inspiziert zeigen Chiffretext; Passphrase-Unlock übersteht Reload.*
5. **Volltextsuche & Tags**: FlexSearch-Integration, kombinierte Text+Tag-Suche, Performance-Validierung. *Exit: <200ms Latenz bei mehreren tausend Testnotizen.*
6. **Import/Export**: Exporter zuerst, dann Importer-Registry (Markdown/JSON, danach Evernote/WordPress), Import-Wizard-UI. *Exit: verlustfreier JSON-Roundtrip, erfolgreicher WXR- und ENEX-Import.*
7. **Konflikt-UX-Politur & Härtung**: vollständige Diff-/Konflikt-UI, `THREAT_MODEL.md`, `NAS_SETUP.md` (CORS-Anleitung Synology/QNAP), Storage-Persistence-Flow.

## Verifikation

- **WebDAV**: lokaler WebDAV-Server via Docker (z.B. `hacdias/webdav`) für Dev/CI, mit permissiven CORS-Regeln analog zur späteren NAS-Konfiguration; Integrationstests direkt gegen `webdavClient.ts`.
- **Sync/Konflikte**: Unit-Tests gegen gemockten WebDAV-Client (sauberer Push/Pull, simultane Zwei-Geräte-Bearbeitung, Offline-Queue+Reconnect, Tombstone-Propagation).
- **Crypto**: Roundtrip-Tests (Verschlüsseln→Entschlüsseln), Fehlerverhalten bei falscher Passphrase (fail-closed).
- **PWA/Offline**: Android via Chrome DevTools + Lighthouse-PWA-Audit + Playwright; iOS Safari zwingend manuell auf echtem/simuliertem Gerät (Safari Web Inspector) testen, da WebKit-Playwright iOS-PWA-Spezifika (Storage-Eviction, Standalone-Mode) nicht zuverlässig abbildet.
- **Import-Fixtures**: `test/fixtures/` mit Beispiel-JSON/MD/ENEX/WXR-Dateien für Regressionstests.

### Kritische Dateien für die Umsetzung
- `src/db/schema.ts`
- `src/sync/syncEngine.ts`
- `src/crypto/keyDerivation.ts`
- `src/importers/index.ts`
- `vite.config.ts` (PWA-Plugin-Konfiguration + iOS-Meta-Tags in `index.html`)
