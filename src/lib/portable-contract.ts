import { z } from 'zod';
import { validReplyUrl } from './bot-contract';

export function validServiceUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; } catch { return false; }
}
export function allowedAppOrigin(origin: string | null) {
  return origin === 'http://localhost:18765' || origin === 'http://127.0.0.1:18765' || origin === 'https://localhost' || origin === 'http://localhost' || origin === 'capacitor://localhost';
}
const replyFields = z.object({ conversationId: z.string().uuid(), text: z.string().trim().max(4000).default(''), mediaPath: z.string().max(300).optional(), mediaType: z.string().max(100).optional(), fileName: z.string().max(200).optional() });
export const replySchema = replyFields.refine(v => v.text.length > 0 || !!v.mediaPath, 'اكتب ردًا أو أرفق ملفًا');
export const portableOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('info') }),
  z.object({ operation: z.literal('save-url'), url: z.string().max(2000).refine(validReplyUrl) }),
  replyFields.extend({ operation: z.literal('reply') }),
]);