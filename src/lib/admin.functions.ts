import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validReplyUrl } from './bot-contract';

export const integrationInfo = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!admin) throw new Error('لا تملك صلاحية الإدارة');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('bot_integration').select('reply_url,last_seen').eq('id', 1).single();
  if (error) throw new Error('تعذر قراءة إعدادات الربط');
  return data;
});

export const saveReplyUrl = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { url: string }) => z.object({ url: z.string().max(2000).refine(validReplyUrl, 'أدخل رابط HTTPS الإنتاجي للرد في n8n') }).parse(data)).handler(async ({ data, context }) => {
  const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!admin) throw new Error('لا تملك صلاحية الإدارة');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('bot_integration').update({ reply_url: data.url }).eq('id', 1);
  if (error) throw new Error('تعذر حفظ الرابط');
  return { ok: true };
});

export const sendReply = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { conversationId: string; text: string }) => z.object({ conversationId: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).parse(data)).handler(async ({ data, context }) => {
  const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (!admin) throw new Error('لا تملك صلاحية الإدارة');
  const { data: conversation, error: conversationError } = await context.supabase.from('conversations').select('*').eq('id', data.conversationId).single();
  if (conversationError || !conversation) throw new Error('المحادثة غير موجودة');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: integration } = await supabaseAdmin.from('bot_integration').select('reply_url,shared_key').eq('id', 1).single();
  if (!integration || !validReplyUrl(integration.reply_url)) throw new Error('احفظ رابط الرد من n8n في إعدادات الربط أولًا');
  const response = await fetch(integration.reply_url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'x-arsh-secret': integration.shared_key }, body: JSON.stringify({ phone: conversation.customer_id, body: data.text, platform: conversation.platform }) });
  const responseBody = await response.text();
  if (!response.ok) { console.error(`n8n reply failed [${response.status}]: ${responseBody}`); throw new Error(`تعذر إرسال الرد عبر n8n (${response.status}): ${responseBody.slice(0,300)}`); }
  let result;
  try { result = JSON.parse(responseBody) as { ok?: boolean }; } catch { throw new Error('لم يصل تأكيد الإرسال من n8n'); }
  if (!result.ok) throw new Error('لم يؤكد n8n إرسال الرسالة');
  const { error } = await supabaseAdmin.from('messages').insert({ conversation_id: conversation.id, direction: 'outgoing', text: data.text, status: 'sent' });
  if (error) throw new Error('تم الإرسال ولكن تعذر حفظ الرد');
  await context.supabase.from('conversations').update({ last_message: data.text, updated_at: new Date().toISOString() }).eq('id', conversation.id);
  return { ok: true };
});