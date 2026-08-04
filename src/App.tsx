import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NotePage } from './pages/NotePage';
import { SettingsMenuPage } from './pages/SettingsMenuPage';
import { SyncPage } from './pages/SyncPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { PassphraseUnlockScreen } from './components/PassphraseUnlockScreen';
import { isEncryptionSetUp } from './crypto/credentialVault';
import { useSessionUnlocked } from './hooks/useSessionKey';

function App() {
  const [vaultSetUp, setVaultSetUp] = useState<boolean>();
  const unlocked = useSessionUnlocked();

  useEffect(() => {
    void isEncryptionSetUp().then(setVaultSetUp);
  }, []);

  // Avoid a flash of unlocked content before we know whether a vault exists.
  if (vaultSetUp === undefined) return null;

  if (vaultSetUp && !unlocked) {
    return <PassphraseUnlockScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/note/:id" element={<NotePage />} />
        <Route path="/settings" element={<SettingsMenuPage />} />
        <Route path="/settings/sync" element={<SyncPage />} />
        <Route path="/settings/import-export" element={<ImportExportPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
