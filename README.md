# myNotes

Ein privates, betreiberunabhängiges Journal als PWA. Lange, tagebuchartige Einträge
(inkl. Reiseberichte) werden lokal auf dem Gerät gespeichert und optional mit dem
eigenen NAS per WebDAV synchronisiert – ohne Cloud-Anbieter, ohne eigenen Server.

**App:** https://s540d.github.io/myNotes/

Das ist eine Demo-Instanz ohne vorkonfiguriertes NAS – sie zeigt die App und läuft
vollständig offline im Browser/als installierte PWA. Für den eigentlichen Zweck
(privates, synchronisiertes Journal) installierst du dir die App selbst und verbindest
sie mit deinem eigenen NAS, sobald der WebDAV-Sync (Phase 2, siehe unten) fertig ist.

## Status

Dieses Repository befindet sich im aktiven Aufbau. Der aktuelle Stand deckt **Phase 1**
des Implementierungsplans ab: eine voll offline nutzbare, installierbare PWA mit
lokaler Journal-Verwaltung (Anlegen, Bearbeiten, Löschen, Tag-Filter, einfache Suche).

Geplante, noch nicht umgesetzte Phasen (siehe Roadmap unten):
- WebDAV-Sync mit dem NAS
- Client-seitige Verschlüsselung (AES-GCM, Passphrase-basiert)
- Volltextsuche via FlexSearch (aktuell: einfache Teilstring-Suche als Platzhalter)
- Import/Export (JSON, Markdown, Evernote `.enex`, WordPress-Export)
- Konflikt-UX, Threat-Model-Dokumentation, NAS-Setup-Anleitung

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
```

Die App ist als PWA ausgelegt und läuft installiert sowohl auf Android Chrome als auch
über "Zum Home-Bildschirm" in iOS Safari.

## Wie geht es weiter?

Aktueller Stand: **Phase 1** (lokales Journal + PWA-Shell) ist abgeschlossen und läuft
als Demo auf GitHub Pages. Der nächste Schritt ist **Phase 2: WebDAV-Sync** mit dem
eigenen NAS, danach folgen Verschlüsselung, Volltextsuche und Import/Export. Der
vollständige Implementierungsplan (Datenmodell, Sync-Engine, Verschlüsselungsdesign,
Phasenplan) steht in [`docs/PLAN.md`](docs/PLAN.md).

## Deployment

Der `main`-Branch wird automatisch per GitHub Actions
(`.github/workflows/deploy-pages.yml`) gebaut und auf GitHub Pages veröffentlicht.
Voraussetzung (einmalig, durch Repo-Owner): in den Repo-Settings unter „Pages“ die
Quelle auf „GitHub Actions“ stellen.

Für einen Deploy auf dem eigenen NAS/Webserver statt GitHub Pages: `npm run build --
--base=/` (oder den gewünschten Unterpfad) und den Inhalt von `dist/` dorthin kopieren.
