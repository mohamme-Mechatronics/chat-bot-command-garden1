import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet, createHashHistory } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings2, X } from 'lucide-react';
import { AdminApp } from '../../src/components/admin-app';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Toaster } from '../../src/components/ui/sonner';
import { validServiceUrl } from '../../src/lib/portable-contract';
import { getServiceUrl } from './configuration';
import '../../src/styles.css';
import './local.css';

const queryClient = new QueryClient();
function Shell() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(getServiceUrl);
  const [cloudUrl, setCloudUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  return <QueryClientProvider client={queryClient}><Outlet /><Button className="portable-settings" variant="outline" size="icon" title="إعدادات التطبيق المحلي" onClick={() => setOpen(true)}><Settings2 /></Button>{open && <div className="portable-overlay"><form className="auth-panel" onSubmit={e => {
    e.preventDefault(); if (!validServiceUrl(url) || (cloudUrl && !validServiceUrl(cloudUrl)) || Boolean(cloudUrl) !== Boolean(key) || (key && !(key.startsWith('sb_publishable_') || key.split('.').length === 3))) { setError('أدخل عنوان HTTPS صحيحًا ومفتاح اتصال عام فقط'); return; }
    localStorage.setItem('arsh-service-url', new URL(url).origin);
    if (cloudUrl && key) { localStorage.setItem('arsh-cloud-url', new URL(cloudUrl).origin); localStorage.setItem('arsh-cloud-key', key); }
    window.location.reload();
  }}><Button type="button" variant="ghost" size="icon" title="إغلاق" onClick={() => setOpen(false)}><X /></Button><h2>إعدادات التطبيق المحلي</h2><label>عنوان خدمة الإدارة<Input dir="ltr" type="url" value={url} onChange={e => setUrl(e.target.value)} required /></label><details><summary>تغيير خدمة البيانات</summary><label>عنوان خدمة البيانات الجديدة<Input dir="ltr" type="url" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} /></label><label>مفتاح الاتصال العام<Input dir="ltr" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" /></label></details>{error && <p className="text-destructive">{error}</p>}<Button type="submit">حفظ وإعادة فتح التطبيق</Button></form></div>}<Toaster position="top-center" richColors /></QueryClientProvider>;
}
const root = createRootRoute({ component: Shell });
const inbox = createRoute({ getParentRoute: () => root, path: '/', component: () => <AdminApp /> });
const requests = createRoute({ getParentRoute: () => root, path: '/requests', component: () => <AdminApp view="requests" /> });
const settings = createRoute({ getParentRoute: () => root, path: '/settings', component: () => <AdminApp view="settings" /> });
const router = createRouter({ routeTree: root.addChildren([inbox, requests, settings]), history: createHashHistory() });
const container = document.getElementById('root');
if (container) createRoot(container).render(<RouterProvider router={router} />);