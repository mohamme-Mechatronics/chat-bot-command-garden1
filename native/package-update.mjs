import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';

const files = {};
async function collect(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await collect(join(dir, entry.name), name + '/');
    else files[name] = new Uint8Array(await readFile(join(dir, entry.name)));
  }
}
await collect('native/dist');
const { version } = JSON.parse(await readFile('native/dist/bundle-version.json', 'utf8'));
const zip = zipSync(files, { level: 6 });
const checksum = createHash('sha256').update(zip).digest('hex');
await mkdir('public/app-updates', { recursive: true });
await writeFile(`public/app-updates/${version}.zip`, zip);
await writeFile('public/app-updates/latest.json', JSON.stringify({ version, path: `/app-updates/${version}.zip`, checksum, nativeVersion: '1.1' }, null, 2));
console.log('Prepared local app update:', version);