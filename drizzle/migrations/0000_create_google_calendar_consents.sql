CREATE TABLE public.google_calendar_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  policy_version text NOT NULL,
  consented_at timestamp with time zone NOT NULL DEFAULT now(),
  purpose text NOT NULL,
  action text NOT NULL CHECK (action IN ('connect', 'reauthorize'))
);

GRANT SELECT, INSERT ON public.google_calendar_consents TO authenticated;
GRANT ALL ON public.google_calendar_consents TO service_role;

ALTER TABLE public.google_calendar_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record own Google Calendar consent"
ON public.google_calendar_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own Google Calendar consents"
ON public.google_calendar_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX google_calendar_consents_user_id_consented_at_idx
ON public.google_calendar_consents (user_id, consented_at DESC);