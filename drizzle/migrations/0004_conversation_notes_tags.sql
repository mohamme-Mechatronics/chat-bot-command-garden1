CREATE TABLE public.conversation_notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE, note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_notes TO authenticated;
GRANT ALL ON public.conversation_notes TO service_role;
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notes" ON public.conversation_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.conversations ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.conversations.tags IS 'Admin-assigned labels, e.g. مهتم، عميل مؤكد';