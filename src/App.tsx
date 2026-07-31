import { HashRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NotePage } from './pages/NotePage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/note/:id" element={<NotePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
