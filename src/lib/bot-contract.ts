import { z } from 'zod';

export const eventSchema = z.object({
  event: z.enum(['message', 'request', 'status']),
  platform: z.enum(['whatsapp', 'telegram']),
  phone: z.string().min(1).max(100),
  name: z.string().max(200).optional(),
  direction: z.enum(['in', 'out']).optional(),
  body: z.string().max(20000).default(''),
  message_id: z.string().max(300).optional(),
  request: z.object({ type: z.string().max(100), title: z.string().max(300), details: z.record(z.unknown()) }).optional(),
});

export function conversationIdentity(platform: 'whatsapp' | 'telegram', phone: string) {
  return `${platform}:${phone}`;
}

export function validReplyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname.endsWith('/webhook/arsh-panel-reply') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname);
  } catch { return false; }
}
export const MEDIA_LIMIT_BYTES = 16 * 1024 * 1024;
export const allowedMediaTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export function mediaKind(mime: string): 'image' | 'document' | null {
  if (!(allowedMediaTypes as readonly string[]).includes(mime)) return null;
  return mime.startsWith('image/') ? 'image' : 'document';
}
/** Attachments must live under the conversation's own folder in the chat-media bucket. */
export function validMediaPath(conversationId: string, path: string) {
  return path.startsWith(`${conversationId}/`) && !path.includes('..') && /^[\w\-./]+$/.test(path) && path.length < 300;
}
