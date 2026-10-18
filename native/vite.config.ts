import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
  root: path.resolve('native/web'), envDir: path.resolve('.'), base: './',
  plugins: [react(), tailwind()],
  resolve: { alias: [
    { find: '@/lib/admin.functions', replacement: path.resolve('native/web/admin-api.ts') },
    { find: '@/integrations/supabase/client', replacement: path.resolve('native/web/cloud-client.ts') },
    { find: '@/integrations/lovable', replacement: path.resolve('native/web/oauth-adapter.ts') },
    { find: '@tanstack/react-start', replacement: path.resolve('native/web/start-adapter.ts') },
    { find: '@', replacement: path.resolve('src') },
  ] },
  build: { outDir: path.resolve('native/dist'), emptyOutDir: true },
});