import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const version = `1.1.${Math.floor(Date.now() / 1000)}`;
export default defineConfig({
  root: path.resolve('native/web'), envDir: path.resolve('.'), base: './',
  define: { __ARSH_VERSION__: JSON.stringify(version) },
  plugins: [{
    name: 'bundle-local-brand', enforce: 'pre',
    async load(id) {
      if (id !== path.resolve('src/assets/tamkeen_logo.png.asset.json')) return;
      const pointer = JSON.parse(await readFile(id, 'utf8'));
      const response = await fetch(new URL(pointer.url, 'https://chat-bot-command-garden1.lovable.app'));
      if (!response.ok) throw new Error('Unable to bundle brand artwork: ' + response.status);
      const reference = this.emitFile({ type: 'asset', name: 'tamkeen_logo.png', source: new Uint8Array(await response.arrayBuffer()) });
      return `export default {url: import.meta.ROLLUP_FILE_URL_${reference}};`;
    },
  }, react(), tailwind(), { name: 'local-bundle-version', generateBundle() { this.emitFile({ type: 'asset', fileName: 'bundle-version.json', source: JSON.stringify({ version }) }); } }],
  resolve: { alias: [
    { find: '@/lib/admin.functions', replacement: path.resolve('native/web/admin-api.ts') },
    { find: '@/integrations/supabase/client', replacement: path.resolve('native/web/cloud-client.ts') },
    { find: '@/integrations/lovable', replacement: path.resolve('native/web/oauth-adapter.ts') },
    { find: '@tanstack/react-start', replacement: path.resolve('native/web/start-adapter.ts') },
    { find: '@', replacement: path.resolve('src') },
  ] },
  build: { outDir: path.resolve('native/dist'), emptyOutDir: true },
});