import { useState, type FormEvent } from 'react';
import { unlockVault } from '../crypto/credentialVault';
import { setSessionKey } from '../crypto/session';
import { useI18n } from '../i18n/I18nContext';

export function PassphraseUnlockScreen() {
  const { t } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const key = await unlockVault(passphrase);
      setSessionKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold text-[var(--text-primary)]">{t.passphraseUnlock.heading}</h1>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{t.passphraseUnlock.description}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder={t.passphraseUnlock.placeholder}
            autoFocus
            className="field-input"
          />
          {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}
          <button type="submit" disabled={!passphrase || busy} className="btn btn-primary">
            {busy ? t.passphraseUnlock.checking : t.passphraseUnlock.unlock}
          </button>
        </form>
      </div>
    </div>
  );
}
