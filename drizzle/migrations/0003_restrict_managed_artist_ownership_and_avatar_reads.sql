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