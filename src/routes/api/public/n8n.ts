import { createFileRoute } from '@tanstack/react-router';
import { eventSchema } from '@/lib/bot-contract';
import { verifyN8nSecret } from '@/lib/n8n-auth.server';

export const Route = createFileRoute('/api/public/n8n')({
  server: { handlers: { POST: async ({ request }) => {
    const supabaseAdmin = await verifyN8nSecret(request);
    if (!supabaseAdmin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let input;
    try { input = eventSchema.safeParse(await request.json()); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!input.success) return Response.json({ error: 'Invalid event' }, { status: 400 });
    const e = input.data;
    const { data: previous, error: readError } = await supabaseAdmin.from('conversations').select('*').eq('platform', e.platform).eq('customer_id', e.phone).maybeSingle();
    if (readError) return Response.json({ error: 'Storage unavailable' }, { status: 503 });
    await supabaseAdmin.from('bot_integration').update({ last_seen: new Date().toISOString() }).eq('id', 1);
    if (e.event === 'status') return Response.json({ bot_paused: previous?.bot_paused ?? false });
    const { data: conversation, error } = await supabaseAdmin.from('conversations').upsert({
      platform: e.platform, customer_id: e.phone,
      customer_name: e.name?.replace(/^\[تلجرام\]\s*/, '') || previous?.customer_name || e.phone,
      last_message: e.event === 'message' ? e.body : previous?.last_message || '',
      unread: (previous?.unread || 0) + (e.direction === 'in' ? 1 : 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'platform,customer_id' }).select().single();
    if (error || !conversation) return Response.json({ error: 'Unable to store event' }, { status: 500 });
    if (e.event === 'message') {
      const { error: messageError } = await supabaseAdmin.from('messages').upsert({ conversation_id: conversation.id, direction: e.direction === 'out' ? 'outgoing' : 'incoming', text: e.body, external_id: e.message_id ? `${e.platform}:${e.message_id}:${e.direction}` : null }, { onConflict: 'external_id', ignoreDuplicates: true });
      if (messageError) return Response.json({ error: 'Unable to store message' }, { status: 500 });
    } else if (e.request) {
      const { error: requestError } = await supabaseAdmin.from('bot_requests').insert({ conversation_id: conversation.id, kind: e.request.type, details: { title: e.request.title, ...e.request.details } as import('@/integrations/supabase/types').Json });
      if (requestError) return Response.json({ error: 'Unable to store request' }, { status: 500 });
    }
    return Response.json({ ok: true });
  } } },
});