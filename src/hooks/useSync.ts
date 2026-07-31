import { useCallback, useEffect, useState } from 'react';
import { isSyncConfigured, runSync, type SyncSummary } from '../sync/syncEngine';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSummary, setLastSummary] = useState<SyncSummary>();
  const [configured, setConfigured] = useState(false);

  const refreshConfigured = useCallback(async () => {
    setConfigured(await isSyncConfigured());
  }, []);

  useEffect(() => {
    void refreshConfigured();
  }, [refreshConfigured]);

  const sync = useCallback(async () => {
    setStatus('syncing');
    try {
      const summary = await runSync();
      setLastSummary(summary);
      setStatus(summary.errors.length > 0 ? 'error' : 'idle');
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setLastSummary({ pushed: 0, pulled: 0, deletedRemote: 0, deletedLocal: 0, conflicts: 0, errors: [message] });
      throw err;
    }
  }, []);

  return { status, lastSummary, configured, sync, refreshConfigured };
}
