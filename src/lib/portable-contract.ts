import { z } from 'zod';
import { validReplyUrl } from './bot-contract';

export function validServiceUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; } catch { return false; }
}
export function allowedAppOrigin(origin: string | null) {
  return origin === 'http://localhost:18765' || origin === 'http://127.0.0.1:18765' || origin === 'https://localhost' || origin === 'http://localhost' || origin === 'capacitor://localhost';
}
export const portableOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('info') }),
  z.object({ operation: z.literal('save-url'), url: z.string().max(2000).refine(validReplyUrl) }),
  z.object({ operation: z.literal('reply'), conversationId: z.string().uuid(), text: z.string().trim().min(1).max(4000) }),
]);