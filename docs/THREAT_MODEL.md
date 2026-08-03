# Threat Model

What myNotes' optional encryption ([Phase 3](https://github.com/S540d/myNotes/issues/4)) actually protects, and — more importantly — what it does **not**. Written to be read before deciding whether myNotes is safe enough for a particular use case, not as a marketing claim. Refers to the actual code (`src/crypto/`, `src/sync/`), not an idealized design.

## In one sentence

Encryption in myNotes protects the **content of your notes while they're on the NAS or in transit to it**. It does **not** protect the notes while they're on your device, and it does **not** hide that you have notes, how many, or roughly when you last edited them.

## What's protected

When encryption is enabled (`src/crypto/encryptNote.ts`), for every note pushed to the NAS:

- **Title, body, entry date, and tags** are encrypted together as one JSON blob with AES-256-GCM before upload. Anyone with access to the NAS files sees only ciphertext for these fields.
- The passphrase never leaves the device and is never itself stored; a key is derived from it via PBKDF2-SHA256 (≥210,000 iterations, `src/crypto/keyDerivation.ts`) and kept only in memory for the session (`src/crypto/session.ts`) — closing the tab/app forgets it, requiring the passphrase again on next unlock.
- WebDAV credentials, once encryption is set up, are stored in a passphrase-encrypted local vault (`src/crypto/credentialVault.ts`) rather than in plaintext.
- Tampering is detected, not silently accepted: AES-GCM's authentication tag means a modified ciphertext or a wrong passphrase fails decryption loudly (`WrongPassphraseError`, `src/crypto/decryptNote.ts`) instead of producing corrupted-but-accepted content.

## What's explicitly *not* protected

### 1. Local, on-device storage is always plaintext

This is the most important point in this document. The `encrypted` flag on a note controls only whether the copy **pushed to the NAS** is ciphertext. The on-device copy in IndexedDB (`src/db/repository.ts`) is written and read as plain JSON at all times — full-text search (`src/search/indexManager.ts`) and every screen in the app operate directly on it. Enabling encryption does not encrypt-at-rest on the device.

When a vault exists, the app does show a passphrase unlock screen before rendering anything (`src/App.tsx`) — this gates the *app's own UI*, not the underlying browser storage. Anyone with lower-level access to the device or browser profile (another OS user account, browser devtools on an unlocked machine, a device-level malware/forensic tool, an unencrypted device backup) can read IndexedDB directly, bypassing the unlock screen entirely.

**Consequence:** myNotes' encryption is a NAS/transport control, not a device-compromise control. If your threat model includes "someone gets hold of my unlocked phone/laptop," this feature does not address that — full-disk encryption and a device passcode do.

### 2. Metadata is visible even with content encrypted

A WebDAV directory listing (`PROPFIND`, `src/sync/webdavClient.ts`) is not itself encrypted. Anyone who can browse the NAS's `myNotes/` folder — the NAS operator, anyone else with WebDAV access, a NAS-level compromise — can see, without the passphrase:

- **How many notes exist** (file count in `notes/` and `tombstones/`).
- **Roughly how large each note is** (ciphertext length tracks plaintext length plus a small fixed overhead).
- **When each note was last modified** (file `Last-Modified`/ETag, and the envelope's unencrypted `updatedAt`/`version` fields, kept in the clear specifically so sync can work without decrypting — see the comment in `encryptNote.ts`).
- **That encryption is enabled at all**, and its KDF parameters (salt, iteration count) — visible via the published `vault.json` descriptor (`putVaultDescriptor`/`getVaultDescriptor`), which exists so a second device can find and join an existing vault. The descriptor's `verifier` field is itself ciphertext and reveals nothing on its own.

None of this exposes note *content* (title, body, tags, entry date) — those stay ciphertext throughout. But usage patterns (an active journal vs. a dormant one, roughly how much you wrote and when) are not hidden.

Filenames are random UUIDs, not derived from title or date, specifically to avoid leaking content through the file list itself (see `encryptNote.ts`) — this part *is* handled.

### 3. Transport security depends on your NAS's HTTPS setup

`webdavClient.ts` connects to whatever URL you configure; it does not enforce HTTPS or reject plain HTTP. If your WebDAV endpoint is HTTP-only, your WebDAV credentials and (if encryption is off) full note content travel in the clear on the network. **Always configure HTTPS on the NAS side** — see `docs/NAS_SETUP.md`. Even with encryption enabled, HTTP still exposes the WebDAV Basic/Digest credentials themselves.

### 4. Passphrase strength is the only defense against offline brute-force

If an attacker obtains the NAS files (ciphertext + `vault.json`'s KDF params and verifier), they can attempt an offline brute-force of the passphrase at whatever rate their hardware allows — PBKDF2 at 210k iterations raises the cost per guess but does not make it infeasible against a weak or reused passphrase. The Settings UI enforces only a minimum length of 8 characters; there's no strength meter or breach-list check. Use a genuinely strong, unique passphrase — this is the single point of failure for everything encryption protects.

### 5. No recovery if the passphrase is lost

There is no password-reset mechanism, by design (that would require a recoverable key, defeating the point). Losing the passphrase means losing access to every note that was ever pushed to the NAS while encrypted; the on-device plaintext copy (see point 1) may still be readable on that specific device until it's cleared, but there is no supported recovery path once that's gone too.

### 6. Availability isn't guaranteed, only tamper-*detection*

Anyone with write access to the NAS (the operator, a compromised NAS) can delete or corrupt note files. myNotes will detect corruption on decrypt (fails closed, per point above) but cannot prevent deletion or recover lost data — the NAS is not a trusted backup authority in this model, it's a sync target you're choosing to trust with availability but not confidentiality of content.

## Summary table

| Asset | Protected by encryption? |
|---|---|
| Note title/body/tags/date, on the NAS | ✅ Yes (AES-256-GCM) |
| Note title/body/tags/date, on this device (IndexedDB) | ❌ No — always plaintext locally |
| WebDAV credentials, on this device | ✅ Yes, once a vault exists |
| Note count / sizes / edit timestamps, on the NAS | ❌ No — visible via directory listing |
| That encryption is enabled at all | ❌ No — `vault.json` is published unencrypted (its contents are safe, its existence isn't hidden) |
| Credentials/content in transit over plain HTTP | ❌ No — use HTTPS on the NAS |
| Passphrase itself | ✅ Never transmitted or stored, but its strength is the only brute-force defense |

---
Part of the overall plan in `docs/PLAN.md`; see there for the full architecture (data model, sync engine, crypto envelope).
