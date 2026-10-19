import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = { appId: 'com.arshalhandasa.admin', appName: 'تمكين', webDir: 'dist', android: { allowMixedContent: false }, plugins: { CapacitorUpdater: { autoUpdate: false, statsUrl: '', channelUrl: '', updateUrl: '', appReadyTimeout: 30000, version: '1.1.0' } } };
export default config;