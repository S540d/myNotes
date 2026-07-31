import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deletePlainWebDavConfig, getWebDavConfig, saveWebDavConfig, type WebDavConfig } from '../sync/syncEngine';
import * as webdavClient from '../sync/webdavClient';
import * as credentialVault from '../crypto/credentialVault';
import type { EncryptionVaultRecord, VaultDescriptor } from '../crypto/credentialVault';
import { getSessionKey, setSessionKey } from '../crypto/session';
import { useSessionUnlocked } from '../hooks/useSessionKey';
import { bulkSetEncryption } from '../db/repository';
import { useSync } from '../hooks/useSync';

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'error'; message: string };
type BulkProgress = { kind: 'encrypt' | 'decrypt'; done: number; total: number };

export function SettingsPage() {
  const navigate = useNavigate();
  const { status, lastSummary, configured, sync, refreshConfigured } = useSync();
  const unlocked = useSessionUnlocked();

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [testState, setTestState] = useState<TestState>({ kind: 'idle' });

  const [vaultRecord, setVaultRecord] = useState<EncryptionVaultRecord>();
  const [remoteDescriptor, setRemoteDescriptor] = useState<VaultDescriptor | null>();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [encBusy, setEncBusy] = useState(false);
  const [encError, setEncError] = useState<string>();
  const [bulkProgress, setBulkProgress] = useState<BulkProgress>();

  useEffect(() => {
    void (async () => {
      const vault = await credentialVault.getVaultRecord();
      setVaultRecord(vault);

      const key = getSessionKey();
      const config = vault && key ? await credentialVault.getVaultCredentials(key) : await getWebDavConfig();
      if (config) {
        setUrl(config.url);
        setUsername(config.username);
        setPassword(config.password);
      }
      setLoaded(true);
    })();
  }, []);

  const currentConfig = (): WebDavConfig => ({ url: url.trim(), username, password });

  const handleSave = async () => {
    const config = currentConfig();
    const key = getSessionKey();
    if (vaultRecord && key) {
      await credentialVault.saveVaultCredentials(key, config);
    } else {
      await saveWebDavConfig(config);
    }
    await refreshConfigured();
    setTestState({ kind: 'idle' });
  };

  const handleTestConnection = async () => {
    setTestState({ kind: 'testing' });
    const config = currentConfig();
    try {
      await webdavClient.testConnection(config);
      setTestState({ kind: 'ok' });
    } catch (err) {
      setTestState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return;
    }
    if (!vaultRecord) {
      try {
        setRemoteDescriptor((await credentialVault.fetchRemoteDescriptor(config)) ?? null);
      } catch {
        setRemoteDescriptor(null);
      }
    }
  };

  const handleSync = async () => {
    await handleSave();
    try {
      await sync();
    } catch {
      // surfaced via `status`/`lastSummary` below
    }
  };

  const handleActivateEncryption = async () => {
    setEncBusy(true);
    setEncError(undefined);
    try {
      const config = currentConfig();
      let key: CryptoKey;
      if (remoteDescriptor) {
        key = await credentialVault.adoptRemoteVault(passphrase, remoteDescriptor, config);
      } else {
        if (passphrase.length < 8) throw new Error('Die Passphrase sollte mindestens 8 Zeichen lang sein.');
        if (passphrase !== confirmPassphrase) throw new Error('Die Passphrasen stimmen nicht überein.');
        key = await credentialVault.setUpVault(passphrase, config);
      }
      setSessionKey(key);
      await deletePlainWebDavConfig();
      setVaultRecord(await credentialVault.getVaultRecord());
      setPassphrase('');
      setConfirmPassphrase('');
      await refreshConfigured();
    } catch (err) {
      setEncError(err instanceof Error ? err.message : String(err));
    } finally {
      setEncBusy(false);
    }
  };

  const handleLock = () => {
    setSessionKey(undefined);
    navigate('/');
  };

  const handleBulk = async (encrypted: boolean) => {
    const kind = encrypted ? 'encrypt' : 'decrypt';
    setBulkProgress({ kind, done: 0, total: 0 });
    const total = await bulkSetEncryption(encrypted, (done, total) => setBulkProgress({ kind, done, total }));
    setBulkProgress(undefined);
    if (total > 0) await handleSync();
  };

  if (!loaded) {
    return <p className="p-6 text-[var(--text-secondary)]">Lade…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button type="button" onClick={() => navigate('/')} className="btn btn-ghost mb-4 !px-0">
        ← Zurück
      </button>

      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">NAS-Sync (WebDAV)</h1>

      <div className="flex flex-col gap-3">
        <label className="field-label">
          WebDAV-URL
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://mein-nas.example.com/webdav/myNotes"
            className="field-input"
          />
        </label>

        <label className="field-label">
          Benutzername
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="field-input"
          />
        </label>

        <label className="field-label">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="field-input"
          />
        </label>

        <p className="text-xs text-[var(--text-light)]">
          {vaultRecord
            ? 'Zugangsdaten liegen passphrase-verschlüsselt im lokalen Tresor.'
            : 'Zugangsdaten werden aktuell unverschlüsselt lokal gespeichert. Verschlüsselung unten aktivieren, um das zu ändern.'}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="btn btn-secondary">
            Speichern
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!url || testState.kind === 'testing'}
            className="btn btn-secondary"
          >
            Verbindung testen
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!url || status === 'syncing'}
            className="btn btn-primary"
          >
            {status === 'syncing' ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
          </button>
        </div>

        {testState.kind === 'ok' && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-green)]">
            <span className="status-dot status-dot-synced" />
            Verbindung erfolgreich.
          </p>
        )}
        {testState.kind === 'error' && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-red)]">
            <span className="status-dot status-dot-conflict" />
            Fehler: {testState.message}
          </p>
        )}

        {lastSummary && (
          <div className="card p-3 text-sm text-[var(--text-secondary)]">
            <p>
              Gepusht: {lastSummary.pushed} · Geholt: {lastSummary.pulled} · Gelöscht (remote):{' '}
              {lastSummary.deletedRemote} · Gelöscht (lokal übernommen): {lastSummary.deletedLocal} · Konflikte:{' '}
              {lastSummary.conflicts}
            </p>
            {lastSummary.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[var(--color-red)]">
                {lastSummary.errors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!configured && <p className="text-xs text-[var(--text-light)]">Noch nicht konfiguriert.</p>}
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold text-[var(--text-primary)]">Verschlüsselung</h2>

      {vaultRecord ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className={`status-dot ${unlocked ? 'status-dot-synced' : 'status-dot-pending'}`} />
            Verschlüsselung ist aktiv und {unlocked ? 'entsperrt' : 'gesperrt'}.
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleLock} disabled={!unlocked} className="btn btn-secondary">
              Sperren
            </button>
            <button
              type="button"
              onClick={() => handleBulk(true)}
              disabled={!unlocked || bulkProgress !== undefined}
              className="btn btn-secondary"
            >
              Alle Notizen verschlüsseln
            </button>
            <button
              type="button"
              onClick={() => handleBulk(false)}
              disabled={!unlocked || bulkProgress !== undefined}
              className="btn btn-secondary"
            >
              Alle Notizen entschlüsseln
            </button>
          </div>

          {bulkProgress && bulkProgress.total > 0 && (
            <div>
              <p className="mb-1 text-xs text-[var(--text-secondary)]">
                {bulkProgress.kind === 'encrypt' ? 'Verschlüssele' : 'Entschlüssele'} {bulkProgress.done} /{' '}
                {bulkProgress.total} Notizen…
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--task-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--primary-color)] transition-[width]"
                  style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {remoteDescriptor === undefined &&
              'Erst „Verbindung testen“ oben, um zu prüfen, ob dieses NAS bereits eine Verschlüsselung eingerichtet hat.'}
            {remoteDescriptor === null &&
              'Neue Passphrase festlegen. Titel, Text, Datum und Tags werden damit vor dem Hochladen auf das NAS verschlüsselt (AES-256-GCM); das NAS sieht nur Chiffretext.'}
            {remoteDescriptor &&
              'Dieses NAS hat bereits eine Verschlüsselung eingerichtet. Gib die passende Passphrase ein, um dieses Gerät damit zu verbinden.'}
          </p>

          <label className="field-label">
            Passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="field-input"
            />
          </label>

          {!remoteDescriptor && (
            <label className="field-label">
              Passphrase bestätigen
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(event) => setConfirmPassphrase(event.target.value)}
                className="field-input"
              />
            </label>
          )}

          {encError && <p className="text-sm text-[var(--color-red)]">{encError}</p>}

          <button
            type="button"
            onClick={handleActivateEncryption}
            disabled={!passphrase || encBusy}
            className="btn btn-primary self-start"
          >
            {encBusy ? 'Richte ein…' : remoteDescriptor ? 'Gerät verbinden' : 'Verschlüsselung aktivieren'}
          </button>
        </div>
      )}
    </div>
  );
}
