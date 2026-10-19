import { useState } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../src/components/ui/button';
import { getServiceUrl } from './configuration';
import { validServiceUrl } from '../../src/lib/portable-contract';
import { applyManualUpdate } from './update-policy';

declare const __ARSH_VERSION__: string;

export async function confirmLocalReady() {
  if (Capacitor.isNativePlatform()) await CapacitorUpdater.notifyAppReady();
}

export function AppUpdate() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  if (!Capacitor.isNativePlatform()) return null;
  async function update() {
    if (busy) return;
    setBusy(true); setStatus('جارٍ البحث عن تحديث…');
    try {
      const origin = getServiceUrl();
      if (!validServiceUrl(origin)) throw new Error('عنوان خدمة التحديث غير صحيح');
      const result = await applyManualUpdate(true, __ARSH_VERSION__, async () => {
        const response = await CapacitorHttp.get({ url: origin + '/app-updates/latest.json', headers: { 'Cache-Control': 'no-cache' }, connectTimeout: 15000, readTimeout: 15000 });
        if (response.status !== 200) throw new Error('لم يُنشر تحديث متاح بعد');
        return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      }, async release => {
        setStatus('جارٍ تنزيل التحديث…');
        const bundle = await CapacitorUpdater.download({ url: origin + release.path, version: release.version, checksum: release.checksum });
        setStatus('جارٍ تطبيق التحديث…');
        await CapacitorUpdater.set({ id: bundle.id });
      });
      if (result === 'current') { setStatus('تطبيقك على أحدث إصدار'); toast.success('تطبيقك على أحدث إصدار'); }
    } catch { setStatus('تعذر التحديث؛ النسخة الحالية محفوظة. حاول لاحقًا.'); toast.error('تعذر التحديث؛ تأكد من الإنترنت وحاول لاحقًا'); }
    finally { setBusy(false); }
  }
  return <div className="portable-update"><Button variant="outline" disabled={busy} onClick={() => void update()}><Download size={16} />{busy ? 'جارٍ التحديث…' : 'تحديث التطبيق'}</Button>{status && <p role="status">{status}</p>}</div>;
}