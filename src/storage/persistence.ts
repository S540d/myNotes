export interface PersistenceStatus {
  /** Whether the Storage API's persistence check is available at all (not on older iOS Safari). */
  supported: boolean;
  /** Whether the browser has actually granted persistent storage (only meaningful if `supported`). */
  persisted: boolean;
}

/** Read-only check; the actual `persist()` request happens once at app startup in main.tsx. */
export async function checkStoragePersistence(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persisted) return { supported: false, persisted: false };
  return { supported: true, persisted: await navigator.storage.persisted() };
}
