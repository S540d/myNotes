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
import { useStoragePersistence } from '../hooks/useStoragePersistence';
import { useI18n } from '../i18n/I18nContext';

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'error'; message: string };
type BulkProgress = { kind: 'encrypt' | 'decrypt'; done: number; total: number };

export function SyncPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { status, lastSummary, configured, sync, refreshConfigured } = useSync();
  const unlocked = useSessionUnlocked();
  const storagePersistence = useStoragePersistence();

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
  const hasWebdav = url.trim().length > 0;

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
      let key: CryptoKey;
      if (hasWebdav && remoteDescriptor) {
        key = await credentialVault.adoptRemoteVault(passphrase, remoteDescriptor, currentConfig());
      } else {
        if (passphrase.length < 8) throw new Error(t.settings.passphraseTooShort);
        if (passphrase !== confirmPassphrase) throw new Error(t.settings.passphraseMismatch);
        key = await credentialVault.setUpVault(passphrase, hasWebdav ? currentConfig() : undefined);
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
    return <p className="p-6 text-[var(--text-secondary)]">{t.common.loading}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button type="button" onClick={() => navigate('/settings')} className="btn btn-ghost mb-4 !px-0">
        {t.common.back}
      </button>

      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">{t.settings.heading}</h1>

      {storagePersistence?.supported && !storagePersistence.persisted && (
        <p className="mb-4 flex items-center gap-2 text-xs text-[var(--color-amber)]">
          <span className="status-dot status-dot-pending" />
          {t.settings.storagePersistenceWarning}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <label className="field-label">
          {t.settings.webdavUrlLabel}
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://mein-nas.example.com/webdav/myNotes"
            className="field-input"
          />
        </label>

        {url.trim().toLowerCase().startsWith('http://') && (
          <p className="flex items-center gap-2 text-xs text-[var(--color-amber)]">
            <span className="status-dot status-dot-pending" />
            {t.settings.httpWarning}
          </p>
        )}

        <label className="field-label">
          {t.settings.usernameLabel}
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="field-input"
          />
        </label>

        <label className="field-label">
          {t.settings.passwordLabel}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="field-input"
          />
        </label>

        <p className="text-xs text-[var(--text-light)]">
          {vaultRecord ? t.settings.credentialsEncrypted : t.settings.credentialsPlaintext}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="btn btn-secondary">
            {t.settings.save}
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!url || testState.kind === 'testing'}
            className="btn btn-secondary"
          >
            {t.settings.testConnection}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!url || status === 'syncing'}
            className="btn btn-primary"
          >
            {status === 'syncing' ? t.settings.syncing : t.settings.syncNow}
          </button>
        </div>

        {testState.kind === 'ok' && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-green)]">
            <span className="status-dot status-dot-synced" />
            {t.settings.connectionOk}
          </p>
        )}
        {testState.kind === 'error' && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-red)]">
            <span className="status-dot status-dot-conflict" />
            {t.settings.connectionErrorPrefix} {testState.message}
          </p>
        )}

        {lastSummary && (
          <div className="card p-3 text-sm text-[var(--text-secondary)]">
            <p>{t.settings.syncSummary(lastSummary)}</p>
            {lastSummary.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[var(--color-red)]">
                {lastSummary.errors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!configured && <p className="text-xs text-[var(--text-light)]">{t.settings.notConfigured}</p>}
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold text-[var(--text-primary)]">{t.settings.encryptionHeading}</h2>

      {vaultRecord ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className={`status-dot ${unlocked ? 'status-dot-synced' : 'status-dot-pending'}`} />
            {t.settings.encryptionActive(unlocked)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleLock} disabled={!unlocked} className="btn btn-secondary">
              {t.settings.lock}
            </button>
            <button
              type="button"
              onClick={() => handleBulk(true)}
              disabled={!unlocked || bulkProgress !== undefined}
              className="btn btn-secondary"
            >
              {t.settings.encryptAll}
            </button>
            <button
              type="button"
              onClick={() => handleBulk(false)}
              disabled={!unlocked || bulkProgress !== undefined}
              className="btn btn-secondary"
            >
              {t.settings.decryptAll}
            </button>
          </div>

          {bulkProgress && bulkProgress.total > 0 && (
            <div>
              <p className="mb-1 text-xs text-[var(--text-secondary)]">
                {t.settings.bulkProgress(bulkProgress.kind, bulkProgress.done, bulkProgress.total)}
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
            {!hasWebdav && t.settings.newPassphraseSetupLocal}
            {hasWebdav && remoteDescriptor === undefined && t.settings.needsTestFirst}
            {hasWebdav && remoteDescriptor === null && t.settings.newPassphraseSetup}
            {hasWebdav && remoteDescriptor && t.settings.existingVaultFound}
          </p>

          <label className="field-label">
            {t.settings.passphraseLabel}
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="field-input"
            />
          </label>

          {!remoteDescriptor && (
            <label className="field-label">
              {t.settings.passphraseConfirmLabel}
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
            {encBusy ? t.settings.settingUp : remoteDescriptor ? t.settings.connectDevice : t.settings.activateEncryption}
          </button>
        </div>
      )}
    </div>
  );
}
