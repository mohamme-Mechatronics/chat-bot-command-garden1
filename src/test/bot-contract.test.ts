import { describe, expect, it } from 'vitest';
import { conversationIdentity, eventSchema, validReplyUrl } from '@/lib/bot-contract';
describe('Shared bot rules', () => {
  it('keeps WhatsApp and Telegram customers separate', () => {
    expect(conversationIdentity('whatsapp','123')).toBe('whatsapp:123');
    expect(conversationIdentity('telegram','123')).toBe('telegram:123');
    expect(conversationIdentity('whatsapp','123')).not.toBe(conversationIdentity('telegram','123'));
  });
  it('accepts both requested platforms and rejects missing platform', () => {
    for (const platform of ['whatsapp','telegram']) expect(eventSchema.safeParse({event:'status',phone:'123',platform}).success).toBe(true);
    expect(eventSchema.safeParse({event:'status',phone:'123'}).success).toBe(false);
  });
  it('only permits secure production reply webhook links', () => {
    expect(validReplyUrl('https://n8n.example.com/webhook/arsh-panel-reply')).toBe(true);
    expect(validReplyUrl('http://n8n.example.com/webhook/arsh-panel-reply')).toBe(false);
    expect(validReplyUrl('https://127.0.0.1/webhook/arsh-panel-reply')).toBe(false);
    expect(validReplyUrl('https://n8n.example.com/webhook-test/arsh-panel-reply')).toBe(false);
  });
});