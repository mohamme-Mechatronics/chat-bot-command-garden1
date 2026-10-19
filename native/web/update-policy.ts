import { z } from 'zod';

export const updateManifest = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  path: z.string().regex(/^\/app-updates\/[a-zA-Z0-9.-]+\.zip$/),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  nativeVersion: z.literal('1.1'),
});

export function needsUpdate(current: string, next: string) {
  const a = current.split('.').map(Number);
  const b = next.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((b[i] ?? 0) !== (a[i] ?? 0)) return (b[i] ?? 0) > (a[i] ?? 0);
  }
  return false;
}

export async function applyManualUpdate(
  requested: boolean,
  current: string,
  load: () => Promise<unknown>,
  apply: (release: z.infer<typeof updateManifest>) => Promise<void>,
) {
  if (!requested) return 'idle';
  const release = updateManifest.parse(await load());
  if (!needsUpdate(current, release.version)) return 'current';
  await apply(release);
  return 'applied';
}