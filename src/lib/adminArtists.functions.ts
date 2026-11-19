import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONNECTOR_ID = "google_calendar";

export type AdminArtist = {
  id: string;
  artist_name: string;
  handle: string | null;
  city: string | null;
  genre: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  show_whatsapp: boolean;
  contact_email: string | null;
  instagram: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  spotify: string | null;
  soundcloud: string | null;
  calendar: "connected" | "disconnected";
};

const EditableSchema = z.object({
  artist_name: z.string().trim().min(1).max(80),
  handle: z.string().trim().min(2).max(40).regex(/^[a-z0-9_.-]+$/i).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  genre: z.string().trim().max(80).optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  show_whatsapp: z.boolean().optional(),
  contact_email: z.string().trim().max(200).optional().nullable(),
  instagram: z.string().trim().max(200).optional().nullable(),
  tiktok: z.string().trim().max(200).optional().nullable(),
  twitter: z.string().trim().max(200).optional().nullable(),
  youtube: z.string().trim().max(200).optional().nullable(),
  spotify: z.string().trim().max(200).optional().nullable(),
  soundcloud: z.string().trim().max(200).optional().nullable(),
});

export const listArtistsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { artistUserIds } = await import("@/server/roles.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Administrators are never listed as artists.
    const ids = Array.from(await artistUserIds(context.userId));
    if (ids.length === 0) return { artists: [] as AdminArtist[] };

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", ids)
      .order("artist_name", { ascending: true });
    if (error) throw error;

    const { data: conns } = await supabaseAdmin
      .from("app_user_connections")
      .select("user_id")
      .eq("connector_id", CONNECTOR_ID);
    const connected = new Set((conns ?? []).map((c) => c.user_id));


    const artists: AdminArtist[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      artist_name: p.artist_name ?? "",
      handle: p.handle ?? null,
      city: p.city ?? null,
      genre: p.genre ?? null,
      bio: p.bio ?? null,
      phone: p.phone ?? null,
      whatsapp: p.whatsapp ?? null,
      show_whatsapp: p.show_whatsapp === true,
      contact_email: p.contact_email ?? null,
      instagram: p.instagram ?? null,
      tiktok: p.tiktok ?? null,
      twitter: p.twitter ?? null,
      youtube: p.youtube ?? null,
      spotify: p.spotify ?? null,
      soundcloud: p.soundcloud ?? null,
      calendar: connected.has(p.id) ? "connected" : "disconnected",
    }));
    return { artists };
  });

export const updateArtistAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).merge(EditableSchema).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { artistUserIds } = await import("@/server/roles.server");
    if (!(await artistUserIds(context.userId)).has(data.id)) throw new Error("Artista não encontrado ou sem permissão.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...fields } = data;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    const { artistUserIds, mediumAdminIds } = await import("@/server/roles.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Counted separately: an administrator is never part of the artist total,
    // and the Admin Master is in neither count.
    const artists = await artistUserIds(context.userId);
    const mediumAdmins = roles.isMaster ? await mediumAdminIds() : new Set<string>();

    const { data: conns } = await supabaseAdmin
      .from("app_user_connections")
      .select("user_id")
      .eq("connector_id", CONNECTOR_ID);
    const connectedCount = new Set(
      (conns ?? []).map((c) => c.user_id).filter((id) => artists.has(id)),
    ).size;

    return {
      totalArtists: artists.size,
      mediumAdmins: mediumAdmins.size,
      isMaster: roles.isMaster,
      connected: connectedCount,
      notConnected: Math.max(0, artists.size - connectedCount),
    };
  });

