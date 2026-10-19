import { describe, expect, it, vi } from 'vitest';
import { applyManualUpdate, needsUpdate, updateManifest } from '../../native/web/update-policy';

const release = { version: '1.1.2', path: '/app-updates/1.1.2.zip', checksum: 'a'.repeat(64), nativeVersion: '1.1' };
describe('User-controlled installed app updates', () => {
  it('never checks or applies updates without a button request', async () => {
    const load = vi.fn(); const apply = vi.fn();
    expect(await applyManualUpdate(false, '1.1.1', load, apply)).toBe('idle');
    expect(load).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
  });
  it('applies a newer local bundle only on request', async () => {
    const apply = vi.fn();
    expect(await applyManualUpdate(true, '1.1.1', async () => release, apply)).toBe('applied');
    expect(apply).toHaveBeenCalledWith(release);
  });
  it('never downgrades or replaces the same version', () => {
    expect(needsUpdate('1.1.2', '1.1.1')).toBe(false);
    expect(needsUpdate('1.1.2', '1.1.2')).toBe(false);
  });
  it('rejects third-party bundle URLs and incompatible native versions', () => {
    expect(updateManifest.safeParse({ ...release, path: 'https://evil.example/app.zip' }).success).toBe(false);
    expect(updateManifest.safeParse({ ...release, nativeVersion: '2.0' }).success).toBe(false);
  });
});