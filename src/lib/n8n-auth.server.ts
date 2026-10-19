import { createHash, timingSafeEqual } from 'node:crypto';

/** Verifies the shared n8n secret header against the stored hash. */
export async function verifyN8nSecret(request: Request) {
  const key = request.headers.get('x-arsh-secret');
  if (!key || key.length > 256) return null;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('bot_integration').select('key_hash').eq('id', 1).maybeSingle();
  const hash = createHash('sha256').update(key).digest('hex');
  if (error || !data || data.key_hash.length !== hash.length || !timingSafeEqual(Buffer.from(hash), Buffer.from(data.key_hash))) return null;
  return supabaseAdmin;
}
