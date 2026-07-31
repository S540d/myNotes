import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWebDavConfig, saveWebDavConfig, type WebDavConfig } from '../sync/syncEngine';
import * as webdavClient from '../sync/webdavClient';
import { useSync } from '../hooks/useSync';

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'error'; message: string };

export function SettingsPage() {
  const navigate = useNavigate();
  const { status, lastSummary, configured, sync, refreshConfigured } = useSync();

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [testState, setTestState] = useState<TestState>({ kind: 'idle' });

  useEffect(() => {
    void getWebDavConfig().then((config) => {
      if (config) {
        setUrl(config.url);
        setUsername(config.username);
        setPassword(config.password);
      }
      setLoaded(true);
    });
  }, []);

  const currentConfig = (): WebDavConfig => ({ url: url.trim(), username, password });

  const handleSave = async () => {
    await saveWebDavConfig(currentConfig());
    await refreshConfigured();
    setTestState({ kind: 'idle' });
  };

  const handleTestConnection = async () => {
    setTestState({ kind: 'testing' });
    try {
      await webdavClient.testConnection(currentConfig());
      setTestState({ kind: 'ok' });
    } catch (err) {
      setTestState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
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
          Zugangsdaten werden vorerst unverschlüsselt lokal gespeichert. Eine passphrase-geschützte Ablage folgt mit
          der Verschlüsselungs-Phase.
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
    </div>
  );
}
