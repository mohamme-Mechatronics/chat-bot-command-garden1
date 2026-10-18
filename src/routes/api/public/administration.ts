import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { allowedAppOrigin, portableOperationSchema } from '@/lib/portable-contract';

function cors(request: Request) {
  const origin = request.headers.get('origin');
  const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
  if (allowedAppOrigin(origin) && origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  return headers;
}
export const Route = createFileRoute('/api/public/administration')({ server: { handlers: {
  OPTIONS: ({ request }) => new Response(null, { status: allowedAppOrigin(request.headers.get('origin')) ? 204 : 403, headers: cors(request) }),
  POST: async ({ request }) => {
    const headers = cors(request);
    const origin = request.headers.get('origin');
    if (origin && !allowedAppOrigin(origin) && origin !== new URL(request.url).origin) return Response.json({ error: 'مصدر غير مسموح' }, { status: 403, headers });
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'تسجيل الدخول مطلوب' }, { status: 401, headers });
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) return Response.json({ error: 'خدمة الإدارة غير مهيأة' }, { status: 503, headers });
    const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization }, fetch: (input, init) => { const h = new Headers(init?.headers); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
    const { data: user, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user.user) return Response.json({ error: 'جلسة غير صالحة، سجل الدخول مجددًا' }, { status: 401, headers });
    const { data: admin, error: roleError } = await client.rpc('has_role', { _user_id: user.user.id, _role: 'admin' });
    if (roleError || !admin) return Response.json({ error: 'لا تملك صلاحية الإدارة' }, { status: 403, headers });
    let body: unknown;
    try { if ((request.headers.get('content-length') && Number(request.headers.get('content-length')) > 16000)) return Response.json({ error: 'الطلب كبير جدًا' }, { status: 413, headers }); const text = await request.text(); if (text.length > 16000) return Response.json({ error: 'الطلب كبير جدًا' }, { status: 413, headers }); body = JSON.parse(text); } catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400, headers }); }
    const parsed = portableOperationSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400, headers });
    try {
      const { performAdminOperation } = await import('@/lib/admin-operations.server');
      const result = await performAdminOperation({ supabase: client, userId: user.user.id }, parsed.data.operation, parsed.data.operation === 'info' ? {} : parsed.data);
      return Response.json(result, { headers });
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'تعذر إتمام العملية' }, { status: 502, headers }); }
  },
} } });