import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { mediaKind, validMediaPath, validReplyUrl } from './bot-contract';

type Context = { supabase: SupabaseClient<Database>; userId: string };

export async function performAdminOperation(context: Context, operation: 'info' | 'save-url' | 'reply', data: { url?: string; conversationId?: string; text?: string; mediaPath?: string; mediaType?: string; fileName?: string } = {}) {
  const { data: admin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (roleError || !admin) throw new Error('لا تملك صلاحية الإدارة');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  if (operation === 'info') {
    const { data: info, error } = await supabaseAdmin.from('bot_integration').select('reply_url,last_seen').eq('id', 1).single();
    if (error || !info) throw new Error('تعذر قراءة إعدادات الربط');
    return info;
  }
  if (operation === 'save-url') {
    if (!data.url || !validReplyUrl(data.url)) throw new Error('أدخل رابط HTTPS الإنتاجي للرد في n8n');
    const { error } = await supabaseAdmin.from('bot_integration').update({ reply_url: data.url }).eq('id', 1);
    if (error) throw new Error('تعذر حفظ الرابط');
    return { ok: true as const };
  }
  const text = (data.text || '').trim();
  const kind = data.mediaPath ? mediaKind(data.mediaType || '') : null;
  if (!data.conversationId || (!text && !data.mediaPath)) throw new Error('بيانات الرد غير مكتملة');
  if (data.mediaPath && (!kind || !validMediaPath(data.conversationId, data.mediaPath))) throw new Error('الملف المرفق غير مسموح');
  const { data: conversation, error: conversationError } = await context.supabase.from('conversations').select('*').eq('id', data.conversationId).single();
  if (conversationError || !conversation) throw new Error('المحادثة غير موجودة');
  const { data: integration } = await supabaseAdmin.from('bot_integration').select('reply_url,shared_key').eq('id', 1).single();
  if (!integration || !validReplyUrl(integration.reply_url)) throw new Error('احفظ رابط الرد من n8n في إعدادات الربط أولًا');
  let media: { kind: 'image' | 'document'; url: string; file_name: string } | undefined;
  if (data.mediaPath && kind) {
    const { data: signed, error: signError } = await supabaseAdmin.storage.from('chat-media').createSignedUrl(data.mediaPath, 60 * 60 * 24 * 7);
    if (signError || !signed) throw new Error('تعذر تجهيز الملف المرفق');
    media = { kind, url: signed.signedUrl, file_name: (data.fileName || 'file').slice(0, 120) };
  }
  const response = await fetch(integration.reply_url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'x-arsh-secret': integration.shared_key }, body: JSON.stringify({ phone: conversation.customer_id, body: text, platform: conversation.platform, media }) });
  if (!response.ok) throw new Error(`تعذر إرسال الرد عبر n8n (${response.status})`);
  let result: { ok?: boolean };
  try { result = await response.json(); } catch { throw new Error('لم يصل تأكيد الإرسال من n8n'); }
  if (!result.ok) throw new Error('لم يؤكد n8n إرسال الرسالة');
  const { error } = await supabaseAdmin.from('messages').insert({ conversation_id: conversation.id, direction: 'outgoing', text, status: 'sent', media_url: data.mediaPath ?? null, media_type: kind, file_name: media?.file_name ?? null });
  if (error) throw new Error('تم الإرسال ولكن تعذر حفظ الرد');
  await context.supabase.from('conversations').update({ last_message: text || (kind === 'image' ? '[صورة]' : '[مستند]'), updated_at: new Date().toISOString() }).eq('id', conversation.id);
  return { ok: true as const };
}