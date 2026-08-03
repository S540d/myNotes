import { useEffect, useState } from 'react';
import { checkStoragePersistence, type PersistenceStatus } from '../storage/persistence';

export function useStoragePersistence(): PersistenceStatus | undefined {
  const [status, setStatus] = useState<PersistenceStatus>();

  useEffect(() => {
    void checkStoragePersistence().then(setStatus);
  }, []);

  return status;
}
