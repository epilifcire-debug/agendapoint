import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusSchema = z.enum(["draft", "published", "hidden", "archived"]);
const eventStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
const slugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUrl = z.string().trim().url().max(500).optional().nullable().or(z.literal(""));
const nullableText = (max: number) => z.string().trim().max(max).optional().nullable();

const artistFields = z.object({
  artist_name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  bio: nullableText(3000),
  genre: nullableText(100),
  city: nullableText(100),
  state: nullableText(2),
  phone: nullableText(30),
  whatsapp: nullableText(30),
  contact_email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  show_booking_contact: z.boolean(),
  instagram: nullableText(500),
  spotify: nullableText(500),
  youtube: nullableText(500),
  tiktok: nullableText(500),
  sua_musica: nullableText(500),
  twitter: nullableText(500),
  soundcloud: nullableText(500),
});

const eventFields = z.object({
  title: z.string().trim().min(1).max(160),
  slug: slugSchema,
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  venue: nullableText(200),
  city: nullableText(100),
  state: nullableText(2),
  address: nullableText(300),
  maps_url: nullableUrl,
  ticket_url: nullableUrl,
  description: nullableText(3000),
  status: eventStatusSchema,
  is_published: z.boolean(),
});

export type ManagedArtist = {
  id: string;
  owner_admin_id: string;
  artist_name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  show_booking_contact: boolean;
  instagram: string | null;
  spotify: string | null;
  youtube: string | null;
  tiktok: string | null;
  sua_musica: string | null;
  twitter: string | null;
  soundcloud: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  status: "draft" | "published" | "hidden" | "archived";
};

export type ManagedEvent = {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  banner_path: string | null;
  banner_url?: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  maps_url: string | null;
  ticket_url: string | null;
  description: string | null;
  status: "scheduled" | "completed" | "cancelled";
  is_published: boolean;
};

async function addSignedUrls<T extends object>(
  rows: T[],
  fields: Array<[keyof T, string]>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(rows.map(async (row) => {
    const additions: Record<string, string | null> = {};
    for (const [pathField, urlField] of fields) {
      const path = row[pathField];
      if (typeof path !== "string" || !path) {
        additions[urlField] = null;
        continue;
      }
      if (/^https?:\/\//i.test(path)) {
        additions[urlField] = path;
        continue;
      }
      const { data } = await supabaseAdmin.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
      additions[urlField] = data?.signedUrl ?? null;
    }
    return { ...row, ...additions };
  }));
}

export const listManagedArtists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    let query = context.supabase
      .from("managed_artists")
      .select("*")
      .order("artist_name", { ascending: true });
    if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { artists: await addSignedUrls((data ?? []) as ManagedArtist[], [["avatar_path", "avatar_url"], ["cover_path", "cover_url"]]) };
  });

export const createManagedArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => artistFields.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: artist, error } = await context.supabase
      .from("managed_artists")
      .insert({ ...data, owner_admin_id: context.userId, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "Este endereço público já está em uso." : error.message);
    return { id: artist.id };
  });

export const updateManagedArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).merge(artistFields).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    const { id, ...fields } = data;
    let query = context.supabase.from("managed_artists").update(fields).eq("id", id);
    if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
    const { data: updated, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(error.code === "23505" ? "Este endereço público já está em uso." : error.message);
    if (!updated) throw new Error("Artista não encontrado ou sem permissão.");
    return { ok: true };
  });

export const setManagedArtistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid(), status: statusSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    let query = context.supabase.from("managed_artists").update({ status: data.status }).eq("id", data.id);
    if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
    const { data: updated, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Artista não encontrado ou sem permissão.");
    return { ok: true };
  });

export const listManagedEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ artistId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artistId).maybeSingle();
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    const { data: events, error } = await context.supabase
      .from("managed_artist_events").select("*").eq("artist_id", data.artistId).order("starts_at");
    if (error) throw new Error(error.message);
    return { events: await addSignedUrls((events ?? []) as ManagedEvent[], [["banner_path", "banner_url"]]) };
  });

export const saveManagedEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid().optional(), artist_id: z.string().uuid() }).merge(eventFields).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    const { id, ...fields } = data;
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artist_id).maybeSingle();
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    if (id) {
      let query = context.supabase.from("managed_artist_events").update(fields).eq("id", id).eq("artist_id", data.artist_id);
      if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
      const { data: updated, error } = await query.select("id").maybeSingle();
      if (error) throw new Error(error.code === "23505" ? "Este slug de evento já está em uso." : error.message);
      if (!updated) throw new Error("Evento não encontrado ou sem permissão.");
      return { id };
    }
    const { data: created, error } = await context.supabase.from("managed_artist_events")
      .insert({ ...fields, owner_admin_id: artist.owner_admin_id }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "Este slug de evento já está em uso." : error.message);
    return { id: created.id };
  });

export const deleteManagedEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    let query = context.supabase.from("managed_artist_events").delete().eq("id", data.id);
    if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
    const { data: deleted, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("Evento não encontrado ou sem permissão.");
    return { ok: true };
  });

export const listManagedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ artistId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artistId).maybeSingle();
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    const { data: media, error } = await context.supabase.from("managed_artist_media")
      .select("*").eq("artist_id", data.artistId).order("position");
    if (error) throw new Error(error.message);
    return { media: await addSignedUrls((media ?? []) as Array<Record<string, unknown>>, [["storage_path", "display_url"]]) };
  });

export const addManagedMediaLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({
    artist_id: z.string().uuid(), kind: z.enum(["image", "video"]), external_url: z.string().trim().url().max(500), caption: nullableText(200),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artist_id).maybeSingle();
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    const { error } = await context.supabase.from("managed_artist_media").insert({ ...data, owner_admin_id: artist.owner_admin_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteManagedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    let query = context.supabase.from("managed_artist_media").delete().eq("id", data.id);
    if (!roles.isMaster) query = query.eq("owner_admin_id", context.userId);
    const { data: deleted, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("Mídia não encontrada ou sem permissão.");
    return { ok: true };
  });

export const prepareManagedUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({
    artistId: z.string().uuid(), purpose: z.enum(["avatar", "cover", "banner", "gallery"]), extension: z.enum(["jpg", "jpeg", "png", "webp"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artistId).maybeSingle();
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    const path = `managed/${artist.owner_admin_id}/${data.artistId}/${data.purpose}-${crypto.randomUUID()}.${data.extension}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from("avatars").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

export const confirmManagedUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({
    artistId: z.string().uuid(), purpose: z.enum(["avatar", "cover", "banner", "gallery"]), path: z.string().min(1).max(500), eventId: z.string().uuid().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artistId).maybeSingle();
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    if (!artist || (!roles.isMaster && artist.owner_admin_id !== context.userId)) throw new Error("Artista não encontrado ou sem permissão.");
    if (!data.path.startsWith(`managed/${artist.owner_admin_id}/${data.artistId}/${data.purpose}-`)) throw new Error("Arquivo inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files, error: fileError } = await supabaseAdmin.storage.from("avatars").list(`managed/${artist.owner_admin_id}/${data.artistId}`, { search: data.path.split("/").at(-1) });
    if (fileError || !files?.some(file => data.path.endsWith(`/${file.name}`))) throw new Error("Arquivo não encontrado.");
    if (data.purpose === "avatar" || data.purpose === "cover") {
      const changes = data.purpose === "avatar" ? { avatar_path: data.path } : { cover_path: data.path };
      const { data: updated, error } = await context.supabase.from("managed_artists").update(changes).eq("id", data.artistId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Artista não encontrado ou sem permissão.");
    } else if (data.purpose === "banner" && data.eventId) {
      const { data: updated, error } = await context.supabase.from("managed_artist_events").update({ banner_path: data.path }).eq("id", data.eventId).eq("artist_id", data.artistId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Evento não encontrado ou sem permissão.");
    } else if (data.purpose === "gallery") {
      const { data: artist } = await context.supabase.from("managed_artists").select("owner_admin_id").eq("id", data.artistId).maybeSingle();
      if (!artist) throw new Error("Artista não encontrado ou sem permissão.");
      const { error } = await context.supabase.from("managed_artist_media").insert({ artist_id: data.artistId, owner_admin_id: artist.owner_admin_id, kind: "image", storage_path: data.path });
      if (error) throw new Error(error.message);
    } else {
      throw new Error("Destino de upload inválido.");
    }
    return { ok: true };
  });
