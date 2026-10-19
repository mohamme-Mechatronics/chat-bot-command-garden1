import { createFileRoute } from '@tanstack/react-router';
import { MEDIA_LIMIT_BYTES, mediaKind } from '@/lib/bot-contract';
import { verifyN8nSecret } from '@/lib/n8n-auth.server';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

// Receives a customer's photo/PDF from n8n and attaches it to the already-logged incoming message.
export const Route = createFileRoute('/api/public/n8n-media')({
  server: { handlers: { POST: async ({ request }) => {
    const admin = await verifyN8nSecret(request);
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const h = request.headers;
    const platform = h.get('x-platform'); const phone = h.get('x-phone') || ''; const messageId = h.get('x-message-id') || '';
    const mime = (h.get('x-mime') || h.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
    const kind = mediaKind(mime);
    if ((platform !== 'whatsapp' && platform !== 'telegram') || !phone || phone.length > 100 || !messageId || messageId.length > 300) return Response.json({ error: 'Invalid media event' }, { status: 400 });
    if (!kind) return Response.json({ ok: true, skipped: 'unsupported type' });
    if (Number(h.get('content-length') || 0) > MEDIA_LIMIT_BYTES) return Response.json({ error: 'Too large' }, { status: 413 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MEDIA_LIMIT_BYTES) return Response.json({ error: 'Invalid size' }, { status: 413 });
    const { data: conversation } = await admin.from('conversations').select('id').eq('platform', platform).eq('customer_id', phone).maybeSingle();
    if (!conversation) return Response.json({ error: 'Conversation not found' }, { status: 404 });
    const externalId = `${platform}:${messageId}:in`;
    const { data: message } = await admin.from('messages').select('id,media_url').eq('external_id', externalId).eq('conversation_id', conversation.id).maybeSingle();
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 });
    if (message.media_url) return Response.json({ ok: true, duplicate: true });
    const path = `${conversation.id}/in-${crypto.randomUUID()}.${EXT[mime]}`;
    const { error: upErr } = await admin.storage.from('chat-media').upload(path, bytes, { contentType: mime });
    if (upErr) return Response.json({ error: 'Unable to store media' }, { status: 500 });
    const fileName = (h.get('x-file-name') || (kind === 'image' ? 'صورة' : 'مستند.pdf')).slice(0, 120);
    const { error } = await admin.from('messages').update({ media_url: path, media_type: kind, file_name: decodeURIComponent(fileName) }).eq('id', message.id);
    if (error) return Response.json({ error: 'Unable to attach media' }, { status: 500 });
    return Response.json({ ok: true });
  } } },
});
