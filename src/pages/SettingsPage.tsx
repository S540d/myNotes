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
    return <p className="p-6 text-slate-500">Lade…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        ← Zurück
      </button>

      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-50">NAS-Sync (WebDAV)</h1>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          WebDAV-URL
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://mein-nas.example.com/webdav/myNotes"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Benutzername
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Zugangsdaten werden vorerst unverschlüsselt lokal gespeichert. Eine passphrase-geschützte Ablage folgt mit
          der Verschlüsselungs-Phase.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!url || testState.kind === 'testing'}
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Verbindung testen
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!url || status === 'syncing'}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {status === 'syncing' ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
          </button>
        </div>

        {testState.kind === 'ok' && <p className="text-sm text-emerald-600">Verbindung erfolgreich.</p>}
        {testState.kind === 'error' && <p className="text-sm text-red-600">Fehler: {testState.message}</p>}

        {lastSummary && (
          <div className="mt-4 rounded border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <p>
              Gepusht: {lastSummary.pushed} · Geholt: {lastSummary.pulled} · Gelöscht (remote):{' '}
              {lastSummary.deletedRemote} · Gelöscht (lokal übernommen): {lastSummary.deletedLocal} · Konflikte:{' '}
              {lastSummary.conflicts}
            </p>
            {lastSummary.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-600">
                {lastSummary.errors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!configured && <p className="text-xs text-slate-500 dark:text-slate-400">Noch nicht konfiguriert.</p>}
      </div>
    </div>
  );
}
