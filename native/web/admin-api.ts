import { supabase } from './cloud-client';
import { getServiceUrl } from './configuration';

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('تسجيل الدخول مطلوب');
  const response = await fetch(getServiceUrl() + '/api/public/administration', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'تعذر الاتصال بخدمة الإدارة');
  return result;
}
export const integrationInfo = () => call<{ reply_url: string; last_seen: string | null }>({ operation: 'info' });
export const saveReplyUrl = ({ data }: { data: { url: string } }) => call<{ ok: true }>({ operation: 'save-url', ...data });
export const sendReply = ({ data }: { data: { conversationId: string; text: string; mediaPath?: string; mediaType?: string; fileName?: string } }) => call<{ ok: true }>({ operation: 'reply', ...data });