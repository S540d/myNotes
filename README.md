# myNotes

Ein privates, betreiberunabhängiges Journal als PWA. Lange, tagebuchartige Einträge
(inkl. Reiseberichte) werden lokal auf dem Gerät gespeichert und optional mit dem
eigenen NAS per WebDAV synchronisiert – ohne Cloud-Anbieter, ohne eigenen Server.

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

## Architektur & Roadmap

Der vollständige Implementierungsplan (Datenmodell, Sync-Engine, Verschlüsselungsdesign,
Phasenplan) ist in [`docs/PLAN.md`](docs/PLAN.md) dokumentiert.
