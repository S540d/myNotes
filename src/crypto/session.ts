/** Holds the derived vault key in memory only for the lifetime of the tab — never persisted, cleared on reload. */
type Listener = () => void;

let sessionKey: CryptoKey | undefined;
const listeners = new Set<Listener>();

export function getSessionKey(): CryptoKey | undefined {
  return sessionKey;
}

export function setSessionKey(key: CryptoKey | undefined): void {
  sessionKey = key;
  listeners.forEach((listener) => listener());
}

export function subscribeSessionKey(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
