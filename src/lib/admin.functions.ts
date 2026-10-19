import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validReplyUrl } from './bot-contract';
import { replySchema } from './portable-contract';

export const integrationInfo = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { performAdminOperation } = await import('./admin-operations.server');
  const result = await performAdminOperation(context, 'info');
  if (!('reply_url' in result)) throw new Error('تعذر قراءة إعدادات الربط');
  return result;
});

export const saveReplyUrl = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { url: string }) => z.object({ url: z.string().max(2000).refine(validReplyUrl, 'أدخل رابط HTTPS الإنتاجي للرد في n8n') }).parse(data)).handler(async ({ data, context }) => {
  const { performAdminOperation } = await import('./admin-operations.server');
  return performAdminOperation(context, 'save-url', data);
});

export const sendReply = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { conversationId: string; text: string; mediaPath?: string; mediaType?: string; fileName?: string }) => replySchema.parse(data)).handler(async ({ data, context }) => {
  const { performAdminOperation } = await import('./admin-operations.server');
  return performAdminOperation(context, 'reply', data);
});