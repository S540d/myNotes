# myNotes

Ein privates, betreiberunabhängiges Journal als PWA. Lange, tagebuchartige Einträge
(inkl. Reiseberichte) werden lokal auf dem Gerät gespeichert und optional mit dem
eigenen NAS per WebDAV synchronisiert – ohne Cloud-Anbieter, ohne eigenen Server.

**App:** https://s540d.github.io/myNotes/

Das ist eine Demo-Instanz ohne vorkonfiguriertes NAS – sie zeigt die App und läuft
vollständig offline im Browser/als installierte PWA. Für den eigentlichen Zweck
(privates, synchronisiertes Journal) installierst du dir die App selbst und verbindest
sie mit deinem eigenen NAS, sobald der WebDAV-Sync ([Issue #3](https://github.com/S540d/myNotes/issues/3)) fertig ist.

## Status

Dieses Repository befindet sich im aktiven Aufbau. Der aktuelle Stand deckt **Phase 1**
des Implementierungsplans ab: eine voll offline nutzbare, installierbare PWA mit
lokaler Journal-Verwaltung (Anlegen, Bearbeiten, Löschen, Tag-Filter, einfache Suche).

Geplante, noch nicht umgesetzte Phasen sind als GitHub Issues getrackt:
- [#3 WebDAV-Sync mit dem NAS](https://github.com/S540d/myNotes/issues/3)
- [#4 Client-seitige Verschlüsselung](https://github.com/S540d/myNotes/issues/4) (AES-GCM, Passphrase-basiert)
- [#5 Volltextsuche via FlexSearch](https://github.com/S540d/myNotes/issues/5) (aktuell: einfache Teilstring-Suche als Platzhalter)
- [#6 Import/Export](https://github.com/S540d/myNotes/issues/6) (JSON, Markdown, Evernote `.enex`, WordPress-Export)
- [#7 Konflikt-UX & Härtung](https://github.com/S540d/myNotes/issues/7) (Threat-Model-Dokumentation, NAS-Setup-Anleitung)
- [#8 Testing-Infrastruktur](https://github.com/S540d/myNotes/issues/8) (begleitend)

## Ziele

- **Betreiberunabhängig**: keine Abhängigkeit von einem Cloud-Anbieter, alle Daten
  bleiben auf dem eigenen NAS.
- **Maximale Privatsphäre**: optionale Ende-zu-Ende-Verschlüsselung, bei der das NAS
  nur Chiffretext sieht.
- **Simpel**: bewusst reduzierter Funktionsumfang für Single-User-Journaling, lose an
  WordPress angelehnt, aber ohne dessen Komplexität.
- **Ort für viele Gedanken und Reiseberichte**: Journal-Struktur mit Datum, Tags und
  Suche, ausgelegt auf Jahre an Einträgen.

## Tech-Stack

React 18 + Vite (TypeScript) · Dexie.js (IndexedDB) · `vite-plugin-pwa` (Workbox) ·
CodeMirror 6 · React Router · Tailwind CSS.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build (inkl. Typecheck)
npm run lint      # oxlint
npm test          # Vitest unit tests
npm run test:e2e  # Playwright PWA E2E (installiert vorher `npx playwright install chromium`)
```

Details zur Test-Infrastruktur (inkl. optionalem WebDAV-Integrationstest via Docker):
[`docs/TESTING.md`](docs/TESTING.md).

Die App ist als PWA ausgelegt und läuft installiert sowohl auf Android Chrome als auch
über "Zum Home-Bildschirm" in iOS Safari.

## Wie geht es weiter?

Aktueller Stand: **Phase 1** (lokales Journal + PWA-Shell) ist abgeschlossen und läuft
als Demo auf GitHub Pages. Der nächste Schritt ist
[**Issue #3: WebDAV-Sync**](https://github.com/S540d/myNotes/issues/3) mit dem eigenen
NAS, danach folgen Verschlüsselung, Volltextsuche und Import/Export (siehe die
Issue-Liste oben). Jedes Issue ist so geschrieben, dass es eigenständig – auch in einer
neuen Session – aufgegriffen werden kann. Der vollständige Implementierungsplan
(Datenmodell, Sync-Engine, Verschlüsselungsdesign) steht als Referenz in
[`docs/PLAN.md`](docs/PLAN.md).

## Deployment

Der `main`-Branch wird automatisch per GitHub Actions
(`.github/workflows/deploy-pages.yml`) gebaut und auf GitHub Pages veröffentlicht.
Voraussetzung (einmalig, durch Repo-Owner): in den Repo-Settings unter „Pages“ die
Quelle auf „GitHub Actions“ stellen.

Für einen Deploy auf dem eigenen NAS/Webserver statt GitHub Pages: `npm run build --
--base=/` (oder den gewünschten Unterpfad) und den Inhalt von `dist/` dorthin kopieren.
