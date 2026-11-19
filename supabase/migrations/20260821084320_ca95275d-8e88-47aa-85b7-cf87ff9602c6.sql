CREATE TABLE public.agenda_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month smallint NOT NULL,
  year smallint NOT NULL,
  artist_ids uuid[] NOT NULL DEFAULT '{}',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.agenda_shares TO authenticated;
GRANT ALL ON public.agenda_shares TO service_role;

ALTER TABLE public.agenda_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own shares" ON public.agenda_shares
  FOR SELECT TO authenticated USING (auth.uid() = admin_id AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can create own shares" ON public.agenda_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can revoke own shares" ON public.agenda_shares
  FOR UPDATE TO authenticated USING (auth.uid() = admin_id AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = admin_id);

CREATE INDEX agenda_shares_token_idx ON public.agenda_shares (token);