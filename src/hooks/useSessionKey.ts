import { useSyncExternalStore } from 'react';
import { getSessionKey, subscribeSessionKey } from '../crypto/session';

export function useSessionUnlocked(): boolean {
  return useSyncExternalStore(subscribeSessionKey, () => getSessionKey() !== undefined);
}
