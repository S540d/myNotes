import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkStoragePersistence } from './persistence';

describe('checkStoragePersistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported when the Storage API is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    expect(await checkStoragePersistence()).toEqual({ supported: false, persisted: false });
  });

  it('reports the granted persistence state when supported', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: async () => true } });
    expect(await checkStoragePersistence()).toEqual({ supported: true, persisted: true });
  });

  it('reports not-yet-persisted when supported but not granted', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: async () => false } });
    expect(await checkStoragePersistence()).toEqual({ supported: true, persisted: false });
  });
});
