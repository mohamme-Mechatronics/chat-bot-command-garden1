COMMENT ON COLUMN public.bot_integration.claim_hash IS 'One-use admin enrollment code hash; owner already enrolled by verified email';
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'mohammedqumash3@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;
UPDATE public.bot_integration SET claimed_by = (SELECT id FROM auth.users WHERE lower(email)='mohammedqumash3@gmail.com' AND email_confirmed_at IS NOT NULL), claim_hash = NULL WHERE id = 1 AND claimed_by IS NULL;