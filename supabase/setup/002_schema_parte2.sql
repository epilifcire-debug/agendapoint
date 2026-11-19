-- PARTE 2/2 — rode depois da parte 1.

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

-- ===== drizzle/migrations/0000_create_google_calendar_consents.sql =====
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

-- ===== drizzle/migrations/0001_restrict_google_calendar_consents_to_authenticated.sql =====
REVOKE ALL ON TABLE public.google_calendar_consents FROM anon;
GRANT SELECT, INSERT ON TABLE public.google_calendar_consents TO authenticated;
GRANT ALL ON TABLE public.google_calendar_consents TO service_role;

-- ===== drizzle/migrations/0002_create_managed_artists_events_gallery.sql =====
CREATE TABLE public.managed_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_admin_id uuid NOT NULL,
  legacy_auth_user_id uuid UNIQUE,
  artist_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  genre text,
  city text,
  state text,
  phone text,
  whatsapp text,
  contact_email text,
  show_booking_contact boolean NOT NULL DEFAULT true,
  instagram text,
  spotify text,
  youtube text,
  tiktok text,
  sua_musica text,
  twitter text,
  soundcloud text,
  other_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  avatar_path text,
  cover_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_artists TO authenticated;
GRANT SELECT ON public.managed_artists TO anon;
GRANT ALL ON public.managed_artists TO service_role;
ALTER TABLE public.managed_artists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.managed_artist_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.managed_artists(id) ON DELETE CASCADE,
  owner_admin_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  banner_path text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  venue text,
  city text,
  state text,
  address text,
  maps_url text,
  ticket_url text,
  description text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  is_published boolean NOT NULL DEFAULT false,
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_artist_events TO authenticated;
GRANT SELECT ON public.managed_artist_events TO anon;
GRANT ALL ON public.managed_artist_events TO service_role;
ALTER TABLE public.managed_artist_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.managed_artist_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.managed_artists(id) ON DELETE CASCADE,
  owner_admin_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'video')),
  storage_path text,
  external_url text,
  caption text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_artist_media TO authenticated;
GRANT SELECT ON public.managed_artist_media TO anon;
GRANT ALL ON public.managed_artist_media TO service_role;
ALTER TABLE public.managed_artist_media ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.manages_artist_owner(_owner_admin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _owner_admin_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin_master'::public.app_role
    );
$$;
REVOKE ALL ON FUNCTION private.manages_artist_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.manages_artist_owner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_managed_artist_child_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_owner uuid;
BEGIN
  SELECT owner_admin_id INTO resolved_owner
  FROM public.managed_artists
  WHERE id = NEW.artist_id;
  IF resolved_owner IS NULL THEN
    RAISE EXCEPTION 'Artista inválido';
  END IF;
  NEW.owner_admin_id := resolved_owner;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_managed_artist_child_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_managed_artist_child_owner() TO service_role;

CREATE TRIGGER sync_managed_event_owner
BEFORE INSERT OR UPDATE OF artist_id, owner_admin_id ON public.managed_artist_events
FOR EACH ROW EXECUTE FUNCTION public.sync_managed_artist_child_owner();
CREATE TRIGGER sync_managed_media_owner
BEFORE INSERT OR UPDATE OF artist_id, owner_admin_id ON public.managed_artist_media
FOR EACH ROW EXECUTE FUNCTION public.sync_managed_artist_child_owner();
CREATE TRIGGER update_managed_artists_updated_at
BEFORE UPDATE ON public.managed_artists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_managed_artist_events_updated_at
BEFORE UPDATE ON public.managed_artist_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can view published managed artists"
ON public.managed_artists FOR SELECT TO anon
USING (status = 'published');
CREATE POLICY "Admins can view managed artists"
ON public.managed_artists FOR SELECT TO authenticated
USING (private.manages_artist_owner(owner_admin_id) OR status = 'published');
CREATE POLICY "Admins can create managed artists"
ON public.managed_artists FOR INSERT TO authenticated
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can update managed artists"
ON public.managed_artists FOR UPDATE TO authenticated
USING (private.manages_artist_owner(owner_admin_id))
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can delete managed artists"
ON public.managed_artists FOR DELETE TO authenticated
USING (private.manages_artist_owner(owner_admin_id));

CREATE POLICY "Public can view published managed events"
ON public.managed_artist_events FOR SELECT TO anon
USING (
  is_published = true AND EXISTS (
    SELECT 1 FROM public.managed_artists artist
    WHERE artist.id = artist_id AND artist.status = 'published'
  )
);
CREATE POLICY "Admins can view managed events"
ON public.managed_artist_events FOR SELECT TO authenticated
USING (
  private.manages_artist_owner(owner_admin_id)
  OR (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.managed_artists artist
      WHERE artist.id = artist_id AND artist.status = 'published'
    )
  )
);
CREATE POLICY "Admins can create managed events"
ON public.managed_artist_events FOR INSERT TO authenticated
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can update managed events"
ON public.managed_artist_events FOR UPDATE TO authenticated
USING (private.manages_artist_owner(owner_admin_id))
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can delete managed events"
ON public.managed_artist_events FOR DELETE TO authenticated
USING (private.manages_artist_owner(owner_admin_id));

CREATE POLICY "Public can view published managed media"
ON public.managed_artist_media FOR SELECT TO anon
USING (
  is_published = true AND EXISTS (
    SELECT 1 FROM public.managed_artists artist
    WHERE artist.id = artist_id AND artist.status = 'published'
  )
);
CREATE POLICY "Admins can view managed media"
ON public.managed_artist_media FOR SELECT TO authenticated
USING (
  private.manages_artist_owner(owner_admin_id)
  OR (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.managed_artists artist
      WHERE artist.id = artist_id AND artist.status = 'published'
    )
  )
);
CREATE POLICY "Admins can create managed media"
ON public.managed_artist_media FOR INSERT TO authenticated
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can update managed media"
ON public.managed_artist_media FOR UPDATE TO authenticated
USING (private.manages_artist_owner(owner_admin_id))
WITH CHECK (private.manages_artist_owner(owner_admin_id));
CREATE POLICY "Admins can delete managed media"
ON public.managed_artist_media FOR DELETE TO authenticated
USING (private.manages_artist_owner(owner_admin_id));

CREATE INDEX managed_artists_owner_idx ON public.managed_artists(owner_admin_id);
CREATE INDEX managed_artists_status_idx ON public.managed_artists(status);
CREATE INDEX managed_events_artist_start_idx ON public.managed_artist_events(artist_id, starts_at);
CREATE INDEX managed_events_owner_idx ON public.managed_artist_events(owner_admin_id);
CREATE INDEX managed_media_artist_position_idx ON public.managed_artist_media(artist_id, position);

INSERT INTO public.managed_artists (
  id, owner_admin_id, legacy_auth_user_id, artist_name, slug, bio, genre, city,
  phone, whatsapp, contact_email, show_booking_contact, instagram, spotify,
  youtube, tiktok, twitter, soundcloud, avatar_path, cover_path, status,
  created_at, updated_at
)
SELECT
  p.id,
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin_master'::public.app_role ORDER BY ur.created_at LIMIT 1),
  p.id,
  p.artist_name,
  lower(regexp_replace(COALESCE(NULLIF(p.handle, ''), p.artist_name || '-' || left(p.id::text, 8)), '[^a-zA-Z0-9]+', '-', 'g')),
  p.bio,
  p.genre,
  p.city,
  p.phone,
  p.whatsapp,
  p.contact_email,
  p.show_whatsapp,
  p.instagram,
  p.spotify,
  p.youtube,
  p.tiktok,
  p.twitter,
  p.soundcloud,
  p.avatar_url,
  p.cover_url,
  CASE WHEN NULLIF(p.handle, '') IS NOT NULL THEN 'published' ELSE 'draft' END,
  p.created_at,
  p.updated_at
FROM public.profiles p
JOIN public.user_roles artist_role ON artist_role.user_id = p.id AND artist_role.role = 'artist'::public.app_role
WHERE EXISTS (SELECT 1 FROM public.user_roles master_role WHERE master_role.role = 'admin_master'::public.app_role)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.managed_artists IS 'Perfis de artistas sem login, gerenciados por administradores.';
COMMENT ON COLUMN public.managed_artists.legacy_auth_user_id IS 'Vínculo transitório com a conta antiga do artista; não concede acesso ao perfil gerenciado.';

-- ===== drizzle/migrations/0003_restrict_managed_artist_ownership_and_avatar_reads.sql =====
CREATE OR REPLACE FUNCTION private.manages_artist_owner(_owner_admin_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND (role = 'admin_master'::public.app_role OR (role = 'admin'::public.app_role AND user_id = _owner_admin_id))
  );
$$;
REVOKE ALL ON FUNCTION private.manages_artist_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.manages_artist_owner(uuid) TO authenticated, service_role;
ALTER POLICY "Admins can view managed artists" ON public.managed_artists TO authenticated USING (private.manages_artist_owner(owner_admin_id));
ALTER POLICY "Admins can view managed events" ON public.managed_artist_events TO authenticated USING (private.manages_artist_owner(owner_admin_id));
ALTER POLICY "Admins can view managed media" ON public.managed_artist_media TO authenticated USING (private.manages_artist_owner(owner_admin_id));
DROP POLICY IF EXISTS "Public can read artist images" ON storage.objects;

-- ===== drizzle/migrations/0004_restrict_managed_public_table_reads_to_server.sql =====
REVOKE SELECT ON public.managed_artists FROM anon;
REVOKE SELECT ON public.managed_artist_events FROM anon;
REVOKE SELECT ON public.managed_artist_media FROM anon;
