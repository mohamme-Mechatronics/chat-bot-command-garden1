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