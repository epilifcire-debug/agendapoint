import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


export type PublicEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
};

export const getPublicAgenda = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) =>
    z.object({ handle: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, artist_name, handle, avatar_url, cover_url, cover_fit, cover_zoom, city, genre, bio, instagram, tiktok, twitter, youtube, spotify, soundcloud, phone, whatsapp, show_whatsapp",
      )
      .ilike("handle", data.handle)
      .maybeSingle();

    if (!profile) return { profile: null, events: [] as PublicEvent[] };
    // Migrated artists are published exclusively through their managed page.
    const { data: managedArtist } = await supabaseAdmin.from("managed_artists")
      .select("id").eq("legacy_auth_user_id", profile.id).maybeSingle();
    if (managedArtist) return { profile: null, events: [] as PublicEvent[] };


    const { IMAGES_BUCKET, resolveStoredImage } = await import("@/lib/storagePath");
    async function displayUrl(value?: string | null) {
      const { path, url } = resolveStoredImage(value);
      if (url) return url;
      if (!path) return null;
      const { data: signed } = await supabaseAdmin.storage
        .from(IMAGES_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      return signed?.signedUrl ?? null;
    }

    const publicProfile = {
      artist_name: profile.artist_name,
      handle: profile.handle,
      avatar_url: await displayUrl(profile.avatar_url),
      cover_url: await displayUrl((profile as any).cover_url),
      cover_fit: ((profile as any).cover_fit as "cover" | "contain" | null) ?? "cover",
      cover_zoom: ((profile as any).cover_zoom as number | null) ?? 100,
      city: profile.city,
      genre: profile.genre,
      bio: profile.bio,
      instagram: profile.instagram,
      tiktok: profile.tiktok,
      twitter: profile.twitter,
      youtube: profile.youtube,
      spotify: profile.spotify,
      soundcloud: profile.soundcloud,
      // WhatsApp only when the artist explicitly enabled it and has a number
      show_whatsapp: (profile as any).show_whatsapp === true,
      whatsapp_phone:
        (profile as any).show_whatsapp === true
          ? ((profile as any).phone || (profile as any).whatsapp || null)
          : null,
    };



    const { googleApiFetch } = await import("@/server/googleOAuth.server");
    const params = new URLSearchParams({
      timeMin: new Date().toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const res = await googleApiFetch(profile.id, `/calendar/v3/calendars/primary/events?${params.toString()}`);
    if (!res || !res.ok) return { profile: publicProfile, events: [] as PublicEvent[] };
    const body = (await res.json()) as { items?: Array<Record<string, any>> };
    const events: PublicEvent[] = (body.items ?? []).map((e) => ({
      id: String(e.id),
      summary: String(e.summary ?? "(sem título)"),
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      location: e.location ?? undefined,
    }));
    return { profile: publicProfile, events };
  });
