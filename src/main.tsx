import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

registerSW({ immediate: true });

// iOS Safari can evict IndexedDB for rarely-opened PWAs; requesting persistent
// storage reduces (but does not guarantee) that risk. WebDAV sync remains the
// actual durability backstop, not this API.
if (navigator.storage?.persist) {
  void navigator.storage.persist();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
