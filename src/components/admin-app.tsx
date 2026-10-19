import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { MessageSquare, Send, Search, Inbox, FileText, Settings, LogOut, ArrowRight, Pause, Play, CheckCheck, ShieldCheck, RefreshCw, Link2, CircleHelp, StickyNote, Tag, Plus, Trash2, Volume2, VolumeX, Users, BellRing, ClipboardList, Paperclip, X, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { integrationInfo, saveReplyUrl, sendReply } from '@/lib/admin.functions';
import type { Database } from '@/integrations/supabase/types';
import { MEDIA_LIMIT_BYTES, mediaKind } from '@/lib/bot-contract';
import tamkeenLogo from '@/assets/tamkeen_logo.png.asset.json';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Note = Database['public']['Tables']['conversation_notes']['Row'];

const platformName = (value: string) => value === 'telegram' ? 'تلجرام' : 'واتساب';
const TAG_OPTIONS = ['مهتم بالشراء', 'عميل مؤكد', 'يحتاج زيارة ميدانية', 'استفسار فقط', 'متابعة لاحقًا'];

function playAlert() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* audio blocked */ }
}

function MessageMedia({ path, kind, name }: { path: string; kind: string | null; name: string | null }) {
  const signed = useQuery({ queryKey: ['media', path], staleTime: 50 * 60 * 1000, queryFn: async () => {
    if (/^https:\/\//.test(path)) return path;
    const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600);
    if (error || !data) throw error || new Error('media');
    return data.signedUrl;
  } });
  if (signed.isError) return <span className="media-error">تعذر تحميل المرفق</span>;
  if (!signed.data) return <span className="media-loading">جارٍ تحميل المرفق…</span>;
  if (kind === 'image') return <a href={signed.data} target="_blank" rel="noreferrer" className="media-image"><img src={signed.data} alt={name || 'صورة مرفقة'} loading="lazy" /></a>;
  return <a href={signed.data} target="_blank" rel="noreferrer" className="media-file"><FileDown size={18} /><span>{name || 'مستند'}</span></a>;
}

function RequestDetails({ details }: { details: unknown }) {
  if (!details || typeof details !== 'object') return <p>{String(details ?? '')}</p>;
  const entries = Object.entries(details as Record<string, unknown>).filter(([, v]) => v !== null && v !== '' && v !== undefined);
  if (!entries.length) return null;
  return <dl className="request-fields">{entries.map(([k, v]) => <div key={k} className="request-field"><dt>{k}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>)}</dl>;
}

export function AdminApp({ view = 'inbox' }: { view?: 'inbox' | 'requests' | 'settings' }) {
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [claim, setClaim] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null); const [filter, setFilter] = useState('all'); const [search, setSearch] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [url, setUrl] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null); const fileInput = useRef<HTMLInputElement>(null);
  const [noteText, setNoteText] = useState(''); const [soundOn, setSoundOn] = useState(true);
  const knownIncoming = useRef<Set<string>>(new Set());
  const qc = useQueryClient(); const getInfo = useServerFn(integrationInfo); const saveUrl = useServerFn(saveReplyUrl); const reply = useServerFn(sendReply);

  useEffect(() => {
    const update = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user?.id || null);
      if (data.user) {
        const { data: role } = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
        setAdmin(Boolean(role));
      } else setAdmin(false);
      setReady(true);
    };
    void update();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => { if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) { void update(); qc.clear(); } });
    return () => subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (!admin) return;
    const channel = supabase.channel('admin-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => qc.invalidateQueries({ queryKey: ['conversations'] }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as { id: string; direction: string };
        if (m.direction === 'incoming' && !knownIncoming.current.has(m.id)) {
          knownIncoming.current.add(m.id);
          if (soundOn) playAlert();
          toast.info('رسالة جديدة من عميل', { icon: <BellRing size={15} /> });
        }
        void qc.invalidateQueries({ queryKey: ['messages'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_requests' }, () => qc.invalidateQueries({ queryKey: ['requests'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_notes' }, () => qc.invalidateQueries({ queryKey: ['notes'] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [admin, qc, soundOn]);

  const conversations = useQuery({ queryKey: ['conversations'], enabled: admin, queryFn: async () => { const { data, error } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false }).limit(200); if (error) throw error; return data; } });
  const messages = useQuery({ queryKey: ['messages', selected?.id], enabled: admin && Boolean(selected), queryFn: async () => { if (!selected) return []; const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', selected.id).order('created_at').limit(500); if (error) throw error; return data; } });
  const requests = useQuery({ queryKey: ['requests'], enabled: admin, queryFn: async () => { const { data, error } = await supabase.from('bot_requests').select('*').order('created_at', { ascending: false }).limit(200); if (error) throw error; return data; } });
  const notes = useQuery({ queryKey: ['notes', selected?.id], enabled: admin && Boolean(selected), queryFn: async () => { if (!selected) return []; const { data, error } = await supabase.from('conversation_notes').select('*').eq('conversation_id', selected.id).order('created_at', { ascending: false }).limit(50); if (error) throw error; return data; } });
  const info = useQuery({ queryKey: ['integration'], enabled: admin, queryFn: () => getInfo() });
  const current = conversations.data?.find(c => c.id === selected?.id) || selected;

  const stats = {
    total: conversations.data?.length || 0,
    unread: conversations.data?.reduce((s, c) => s + c.unread, 0) || 0,
    newRequests: requests.data?.filter(r => r.status === 'new').length || 0,
  };

  async function signIn(mode: 'login' | 'signup' | 'reset') {
    setBusy(true);
    try {
      const result = mode === 'reset' ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' }) : mode === 'signup' ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }) : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode !== 'login') toast.success(mode === 'reset' ? 'تحقق من بريدك لإعادة تعيين كلمة المرور' : 'تحقق من بريدك لتأكيد الحساب');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر تسجيل الدخول'); } finally { setBusy(false); }
  }
  async function selectConversation(c: Conversation) { setSelected(c); const { error } = await supabase.from('conversations').update({ unread: 0 }).eq('id', c.id); if (error) toast.error('تعذر تحديد المحادثة كمقروءة'); else void qc.invalidateQueries({ queryKey: ['conversations'] }); }
  async function toggleBot() { if (!current) return; const { error } = await supabase.from('conversations').update({ bot_paused: !current.bot_paused }).eq('id', current.id); if (error) toast.error('تعذر تغيير حالة البوت'); else { toast.success(current.bot_paused ? 'تم استئناف البوت' : 'تم إيقاف البوت لهذا العميل'); void qc.invalidateQueries({ queryKey: ['conversations'] }); } }
  function pickFile(file: File | undefined) { if (!file) return; if (!mediaKind(file.type)) { toast.error('الملفات المسموحة: صور JPG/PNG/WEBP أو PDF'); return; } if (file.size > MEDIA_LIMIT_BYTES) { toast.error('الحد الأقصى لحجم الملف 16 ميجابايت'); return; } setAttachment(file); }
  async function submitReply() { if (!current || (!text.trim() && !attachment)) return; setBusy(true); try {
    let media: { mediaPath: string; mediaType: string; fileName: string } | undefined;
    if (attachment) { const ext = (attachment.name.split('.').pop() || 'bin').replace(/[^\w]/g, '').slice(0, 8) || 'bin'; const path = `${current.id}/${crypto.randomUUID()}.${ext}`; const { error: upErr } = await supabase.storage.from('chat-media').upload(path, attachment, { contentType: attachment.type }); if (upErr) throw new Error('تعذر رفع الملف'); media = { mediaPath: path, mediaType: attachment.type, fileName: attachment.name }; }
    await reply({ data: { conversationId: current.id, text, ...media } }); setText(''); setAttachment(null); toast.success('تم إرسال الرد'); void qc.invalidateQueries({ queryKey: ['messages'] }); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر إرسال الرد'); } finally { setBusy(false); } }
  async function addNote() { if (!current || !noteText.trim()) return; const { error } = await supabase.from('conversation_notes').insert({ conversation_id: current.id, note: noteText.trim() }); if (error) toast.error('تعذر حفظ الملاحظة'); else { setNoteText(''); void qc.invalidateQueries({ queryKey: ['notes'] }); } }
  async function deleteNote(id: string) { const { error } = await supabase.from('conversation_notes').delete().eq('id', id); if (error) toast.error('تعذر حذف الملاحظة'); else void qc.invalidateQueries({ queryKey: ['notes'] }); }
  async function toggleTag(tag: string) { if (!current) return; const tags = current.tags.includes(tag) ? current.tags.filter(t => t !== tag) : [...current.tags, tag]; const { error } = await supabase.from('conversations').update({ tags }).eq('id', current.id); if (error) toast.error('تعذر تحديث الوسوم'); else void qc.invalidateQueries({ queryKey: ['conversations'] }); }

  const filtered = (conversations.data || []).filter(c => (filter === 'all' || filter === 'unread' ? filter !== 'unread' || c.unread > 0 : c.platform === filter) && `${c.customer_name} ${c.customer_id}`.includes(search));

  return <div dir="rtl" className="admin-layout">
    <aside className="nav-rail"><Link to="/" className="brand"><img className="brand-logo" src={tamkeenLogo.url} alt="شعار تمكين" /><span>تمكين<small>مركز إدارة العملاء</small></span></Link><div className="workspace-label">مساحة العمل</div><nav>{[{ to: '/' as const, label: 'المحادثات', icon: Inbox, active: view === 'inbox' }, { to: '/requests' as const, label: 'الطلبات', icon: FileText, active: view === 'requests' }, { to: '/settings' as const, label: 'إعدادات الربط', icon: Settings, active: view === 'settings' }].map(n => <Button key={n.to} asChild variant="ghost" className={`nav-item ${n.active ? 'active' : ''}`}><Link to={n.to}><n.icon />{n.label}{n.to === '/' && <span className="nav-count">{conversations.data?.length || 0}</span>}</Link></Button>)}</nav><div className="rail-bottom"><div className="channel-row"><span className="status-dot" />واتساب <small>قناة العملاء</small></div><div className="channel-row telegram"><Send size={14} />تلجرام <small>@LithiumPowerBot</small></div><div className="owner"><span className="avatar">ت</span><span>إدارة تمكين<small>{admin ? 'حساب المسؤول' : user ? 'بانتظار الصلاحية' : 'تسجيل الدخول مطلوب'}</small></span>{user && <Button size="icon" variant="ghost" title="تسجيل الخروج" onClick={() => supabase.auth.signOut()}><LogOut /></Button>}</div></div></aside>
    <main className="main-workspace"><header className="topbar"><span>مساحة العمل <span className="breadcrumb-slash">/</span> <strong>{view === 'inbox' ? 'المحادثات' : view === 'requests' ? 'الطلبات' : 'إعدادات الربط'}</strong></span><div className="topbar-status"><Button size="icon" variant="ghost" title={soundOn ? 'كتم التنبيه الصوتي' : 'تفعيل التنبيه الصوتي'} onClick={() => setSoundOn(!soundOn)}>{soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}</Button><ShieldCheck size={15} /> إدارة محمية <Button size="icon" variant="ghost" title="تحديث" onClick={() => qc.invalidateQueries()}><RefreshCw /></Button></div></header>
      <section className="page-heading"><div><div className="eyebrow">تمكين · إدارة موحّدة</div><h1>{view === 'inbox' ? 'المحادثات' : view === 'requests' ? 'طلبات العملاء' : 'إعدادات الربط'}</h1><p>{view === 'inbox' ? 'واتساب وتلجرام' : view === 'requests' ? 'عروض الأسعار، الدراسات وخدمات العملاء' : 'n8n · واتساب · تلجرام'}</p></div><div className="connection-badge"><span className={`status-dot ${info.data?.last_seen ? '' : 'waiting'}`} />{info.data?.last_seen ? 'آخر اتصال: ' + new Date(info.data.last_seen).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : 'بانتظار ربط البوت'}</div></section>
      {admin && <section className="stats-row"><div className="stat-card"><Users size={18} /><div><strong>{stats.total}</strong><span>محادثة</span></div></div><div className="stat-card"><BellRing size={18} /><div><strong>{stats.unread}</strong><span>رسالة غير مقروءة</span></div></div><div className="stat-card"><ClipboardList size={18} /><div><strong>{stats.newRequests}</strong><span>طلب جديد</span></div></div></section>}
      {!ready ? <div className="center-state">جاري التحميل…</div> : !admin ? <div className="access-area"><div className="auth-panel"><div className="auth-symbol"><ShieldCheck size={28} /></div><h2>{user ? 'تفعيل حساب المسؤول' : 'تسجيل الدخول للإدارة'}</h2>{!user ? <><form onSubmit={e => { e.preventDefault(); void signIn('login'); }}><label>البريد الإلكتروني<Input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>كلمة المرور<Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="current-password" /></label><Button disabled={busy} type="submit" className="w-full">تسجيل الدخول <ArrowRight /></Button></form><div className="auth-actions"><Button variant="link" disabled={busy} onClick={() => signIn('signup')}>إنشاء حساب</Button><Button variant="link" disabled={busy || !email} onClick={() => signIn('reset')}>نسيت كلمة المرور؟</Button></div></> : <><p>أدخل رمز تفعيل الإدارة المرفق بملف الربط.</p><Input aria-label="رمز تفعيل الإدارة" value={claim} onChange={e => setClaim(e.target.value)} dir="ltr" /><Button className="w-full mt-4" onClick={async () => { const { data, error } = await supabase.rpc('claim_admin', { code: claim }); if (error || !data) toast.error('الرمز غير صحيح أو مستخدم مسبقًا'); else { setAdmin(true); setClaim(''); toast.success('تم تفعيل حساب المسؤول'); } }}>تفعيل الإدارة</Button></>}</div></div> : view === 'settings' ? <div className="settings-content"><h2><Link2 size={20} /> اتصال n8n</h2><div className="settings-line"><span>عنوان استقبال المحادثات</span><code dir="ltr">https://project--b254c0b8-4211-4b5e-aa11-7c64d507f04a-dev.lovable.app/api/public/n8n</code></div><form onSubmit={async e => { e.preventDefault(); try { await saveUrl({ data: { url: url || info.data?.reply_url || '' } }); toast.success('تم حفظ رابط الرد'); void qc.invalidateQueries({ queryKey: ['integration'] }); } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر الحفظ'); } }}><label>رابط الرد الإنتاجي من n8n<Input dir="ltr" type="url" required value={url || info.data?.reply_url || ''} onChange={e => setUrl(e.target.value)} placeholder="https://…/webhook/arsh-panel-reply" /></label><Button type="submit">حفظ رابط الرد <CheckCheck /></Button></form><div className="settings-line"><span>حالة الاتصال</span><strong>{info.data?.last_seen ? 'تم استقبال بيانات من البوت' : 'لم تصل بيانات بعد'}</strong></div>{info.isError && <p className="text-destructive">تعذر قراءة إعدادات الربط</p>}</div> : view === 'requests' ? <div className="requests-content">{requests.isError ? <div className="center-state">تعذر تحميل الطلبات</div> : requests.data?.length ? <div className="request-list">{requests.data.map(r => <article key={r.id} className={`request-card status-${r.status}`}><header><FileText /><strong>{r.kind}</strong><select aria-label="حالة الطلب" value={r.status} onChange={async e => { const { error } = await supabase.from('bot_requests').update({ status: e.target.value }).eq('id', r.id); if (error) toast.error('تعذر تحديث الطلب'); else void qc.invalidateQueries({ queryKey: ['requests'] }); }}><option value="new">جديد</option><option value="working">قيد المتابعة</option><option value="done">مكتمل</option></select></header><RequestDetails details={r.details} /><footer><small>{new Date(r.created_at).toLocaleString('ar')}</small></footer></article>)}</div> : <div className="center-state"><FileText size={40} /><h2>لا توجد طلبات بعد</h2><span>ستظهر طلبات العملاء الواردة هنا.</span></div>}</div> : <div className={`inbox-workspace ${selected ? 'has-selection' : ''}`}><div className="conversation-list"><div className="list-top"><strong>صندوق الوارد <span>{conversations.data?.length || 0}</span></strong><Input placeholder="البحث عن عميل…" aria-label="البحث عن عميل" value={search} onChange={e => setSearch(e.target.value)} /><Search className="search-icon" size={16} /></div><div className="filter-tabs">{[['all', 'الكل'], ['whatsapp', 'واتساب'], ['telegram', 'تلجرام'], ['unread', 'غير مقروء']].map(([key, label]) => <Button key={key} variant="ghost" size="sm" className={filter === key ? 'selected' : ''} onClick={() => setFilter(key || 'all')}>{label}</Button>)}</div><div className="list-items">{conversations.isError ? <p className="empty-list">تعذر تحميل المحادثات</p> : filtered.length ? filtered.map(c => <Button key={c.id} variant="ghost" className={`conversation-item ${c.id === current?.id ? 'chosen' : ''}`} onClick={() => selectConversation(c)}><span className="avatar">{c.customer_name.slice(0, 1)}<span className={`platform-dot ${c.platform}`}>{c.platform === 'telegram' ? <Send size={9} /> : <MessageSquare size={9} />}</span></span><span className="conversation-copy"><strong>{c.customer_name}<small>{new Date(c.updated_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</small></strong><span>{c.last_message}</span><small>{platformName(c.platform)} {c.bot_paused ? '· البوت متوقف' : ''}{c.tags.length ? ' · ' + c.tags.join('، ') : ''}</small></span>{c.unread > 0 && <span className="unread-count">{c.unread}</span>}</Button>) : <div className="empty-list"><Inbox size={26} /><p>{search ? 'لا توجد نتائج' : 'لا توجد محادثات بعد'}</p></div>}</div><div className="list-footer"><span className="status-dot waiting" />{info.data?.last_seen ? 'البيانات متصلة' : 'بانتظار أول محادثة'}</div></div><div className="chat-pane">{current ? <><div className="chat-header"><Button className="back-mobile" variant="ghost" size="icon" title="العودة للمحادثات" onClick={() => setSelected(null)}><ArrowRight /></Button><span className="avatar">{current.customer_name.slice(0, 1)}</span><div><strong>{current.customer_name}</strong><small dir="ltr">{current.customer_id} · {platformName(current.platform)}</small></div><Button className="mr-auto" variant="outline" onClick={toggleBot}>{current.bot_paused ? <Play /> : <Pause />}{current.bot_paused ? 'استئناف البوت' : 'إيقاف البوت'}</Button></div><div className="tag-row"><Tag size={14} />{TAG_OPTIONS.map(t => <Button key={t} size="sm" variant={current.tags.includes(t) ? 'default' : 'outline'} className="tag-chip" onClick={() => toggleTag(t)}>{t}</Button>)}</div><div className="message-stream">{messages.isError ? <p>تعذر تحميل الرسائل</p> : messages.data?.map(m => <div className={`message-bubble ${m.direction}`} key={m.id}>{m.media_url && <MessageMedia path={m.media_url} kind={m.media_type} name={m.file_name} />}{m.text && <p>{m.text}</p>}<small>{new Date(m.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}{m.direction === 'outgoing' && <CheckCheck size={13} />}</small></div>)}</div>{attachment && <div className="attachment-chip"><Paperclip size={14} /><span>{attachment.name}</span><Button type="button" size="icon" variant="ghost" title="إزالة المرفق" onClick={() => setAttachment(null)}><X size={14} /></Button></div>}<form className="composer" onSubmit={e => { e.preventDefault(); void submitReply(); }}><input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} /><Button type="button" size="icon" variant="ghost" title="إرفاق صورة أو PDF" disabled={busy} onClick={() => fileInput.current?.click()}><Paperclip /></Button><Input aria-label="الرد على العميل" placeholder="اكتب ردك للعميل…" value={text} onChange={e => setText(e.target.value)} maxLength={4000} /><Button size="icon" title="إرسال الرد" type="submit" disabled={busy || (!text.trim() && !attachment)}><Send /></Button></form><div className="notes-panel"><h3><StickyNote size={15} /> ملاحظات داخلية <small>(لا يراها العميل)</small></h3><div className="notes-list">{notes.data?.map((n: Note) => <div key={n.id} className="note-item"><p>{n.note}</p><small>{new Date(n.created_at).toLocaleString('ar')}</small><Button size="icon" variant="ghost" title="حذف الملاحظة" onClick={() => deleteNote(n.id)}><Trash2 size={13} /></Button></div>)}{notes.data?.length === 0 && <p className="empty-list">لا توجد ملاحظات بعد</p>}</div><form className="note-form" onSubmit={e => { e.preventDefault(); void addNote(); }}><Input aria-label="ملاحظة داخلية" placeholder="أضف ملاحظة عن هذا العميل…" value={noteText} onChange={e => setNoteText(e.target.value)} maxLength={1000} /><Button size="icon" variant="outline" title="إضافة الملاحظة" type="submit" disabled={!noteText.trim()}><Plus /></Button></form></div></> : <div className="chat-empty"><div className="inbox-art"><MessageSquare size={44} /><span><Send size={23} /></span></div><h2>كل محادثة، في مكان واحد</h2><p>لم تصل محادثات إلى الإدارة الجديدة بعد.</p><div className="channel-tags"><span><MessageSquare size={14} /> واتساب</span><span><Send size={14} /> تلجرام</span></div><div className="empty-bottom"><ShieldCheck size={14} /> محادثات خاصة · وصول للمسؤول فقط</div></div>}</div></div>}
      <footer className="app-footer"><span>تمكين</span><span><CircleHelp size={13} /> مركز إدارة العملاء</span></footer></main>
  </div>;
}
