import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const publicArtistFields = "id, artist_name, slug, bio, genre, city, state, phone, whatsapp, contact_email, show_booking_contact, instagram, spotify, youtube, tiktok, sua_musica, twitter, soundcloud, avatar_path, cover_path" as const;
const publicEventFields = "id, title, slug, banner_path, starts_at, ends_at, venue, city, state, address, maps_url, ticket_url, description, status" as const;

function visibleArtistContacts<T extends { show_booking_contact: boolean; phone: string | null; whatsapp: string | null; contact_email: string | null }>(artist: T) {
  return artist.show_booking_contact ? artist : { ...artist, phone: null, whatsapp: null, contact_email: null };
}

async function signedUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const getManagedPublicArtist = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: artist } = await supabaseAdmin.from("managed_artists")
       .select(publicArtistFields)
      .eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!artist) return { artist: null, events: [], media: [] };
    const [{ data: events }, { data: media }] = await Promise.all([
       supabaseAdmin.from("managed_artist_events").select(publicEventFields).eq("artist_id", artist.id).eq("is_published", true).order("starts_at"),
      supabaseAdmin.from("managed_artist_media").select("id, kind, storage_path, external_url, caption").eq("artist_id", artist.id).eq("is_published", true).order("position"),
    ]);
    return {
       artist: { ...visibleArtistContacts(artist), avatar_url: await signedUrl(artist.avatar_path), cover_url: await signedUrl(artist.cover_path) },
      events: await Promise.all((events ?? []).map(async (event) => ({ ...event, banner_url: await signedUrl(event.banner_path) }))),
      media: await Promise.all((media ?? []).map(async (item) => ({ ...item, display_url: item.external_url ?? await signedUrl(item.storage_path) }))),
    };
  });

export const getManagedPublicEvent = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ artistSlug: slugSchema, eventSlug: slugSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
     const { data: artist } = await supabaseAdmin.from("managed_artists").select(publicArtistFields)
      .eq("slug", data.artistSlug).eq("status", "published").maybeSingle();
    if (!artist) return { artist: null, event: null };
     const { data: event } = await supabaseAdmin.from("managed_artist_events").select(publicEventFields)
      .eq("artist_id", artist.id).eq("slug", data.eventSlug).eq("is_published", true).maybeSingle();
    if (!event) return { artist: null, event: null };
    return {
       artist: { ...visibleArtistContacts(artist), avatar_url: await signedUrl(artist.avatar_path), cover_url: await signedUrl(artist.cover_path) },
      event: { ...event, banner_url: await signedUrl(event.banner_path) },
    };
  });

export const getManagedSlugForLegacyHandle = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ handle: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("handle", data.handle).maybeSingle();
    if (!profile) return { slug: null, managed: false };
    const { data: artist } = await supabaseAdmin.from("managed_artists").select("slug, status").eq("legacy_auth_user_id", profile.id).maybeSingle();
    return { slug: artist?.status === "published" ? artist.slug : null, managed: !!artist };
  });
