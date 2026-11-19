-- 1) New role level
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';

-- 2) Explicit admin-to-admin agenda sharing (read only)
CREATE TABLE IF NOT EXISTS public.admin_agenda_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_agenda_access_unique UNIQUE (owner_user_id, viewer_user_id),
  CONSTRAINT admin_agenda_access_not_self CHECK (owner_user_id <> viewer_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.admin_agenda_access TO authenticated;
GRANT ALL ON public.admin_agenda_access TO service_role;

ALTER TABLE public.admin_agenda_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or viewer can read access rows"
  ON public.admin_agenda_access FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR auth.uid() = viewer_user_id);

CREATE POLICY "Only owner can grant access"
  ON public.admin_agenda_access FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Only owner can revoke access"
  ON public.admin_agenda_access FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE TRIGGER update_admin_agenda_access_updated_at
  BEFORE UPDATE ON public.admin_agenda_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();