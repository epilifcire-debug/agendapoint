REVOKE ALL ON TABLE public.google_calendar_consents FROM anon;
GRANT SELECT, INSERT ON TABLE public.google_calendar_consents TO authenticated;
GRANT ALL ON TABLE public.google_calendar_consents TO service_role;