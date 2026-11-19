import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
  artistId: string;
  artistName: string;
  origin: "manual" | "google_calendar";
  city?: string;
  state?: string;
  status?: "scheduled" | "completed" | "cancelled";
  isPublished?: boolean;
};

export type AgendaOwner = {
  id: string;
  artist_name: string;
  handle: string | null;
  city: string | null;
  genre: string | null;
  kind: "self" | "artist" | "shared_admin";
  managedArtistId?: string;
};

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRoles } = await import("@/server/roles.server");
    const roles = await getRoles(context.userId);
    return { isAdmin: roles.isAdmin, isMaster: roles.isMaster, isArtist: roles.isArtist };
  });

/** Artists only — administrators are never listed here. */
export const listArtists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { artistUserIds } = await import("@/server/roles.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = Array.from(await artistUserIds(context.userId));
    if (ids.length === 0) return { artists: [] };
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, artist_name, handle, city, genre, avatar_url")
      .in("id", ids)
      .order("artist_name", { ascending: true });
    if (error) throw error;
    return { artists: data ?? [] };
  });

/**
 * Agenda owners the caller may read: own agenda, assigned legacy artists, and other
 * administrators' agendas only when explicitly shared with the caller.
 */
export const listAgendaOwners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { artistUserIds, sharedAgendaOwnersFor } = await import("@/server/roles.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    let managedQuery = context.supabase.from("managed_artists").select("id, artist_name, city, genre, legacy_auth_user_id");
    if (!roles.isMaster) managedQuery = managedQuery.eq("owner_admin_id", context.userId);
    const { data: managed, error: managedError } = await managedQuery;
    if (managedError) throw managedError;

    const artists = await artistUserIds(context.userId);
    const shared = await sharedAgendaOwnersFor(context.userId);
    const ids = Array.from(new Set([context.userId, ...artists, ...shared]));

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, artist_name, handle, city, genre")
      .in("id", ids);
    if (error) throw error;

    const owners: AgendaOwner[] = (data ?? []).map((p: any) => ({
      id: p.id,
      artist_name: p.artist_name || "Sem nome",
      handle: p.handle ?? null,
      city: p.city ?? null,
      genre: p.genre ?? null,
      kind:
        p.id === context.userId ? "self" : artists.has(p.id) ? "artist" : "shared_admin",
    }));
    owners.sort((a, b) => {
      const rank = (o: AgendaOwner) => (o.kind === "self" ? 0 : o.kind === "artist" ? 1 : 2);
      return rank(a) - rank(b) || a.artist_name.localeCompare(b.artist_name);
    });
    const managedLegacyIds = new Set((managed ?? []).map((a) => a.legacy_auth_user_id).filter(Boolean));
    return { owners: [
      ...owners.filter((o) => o.kind !== "artist" || !managedLegacyIds.has(o.id)),
      ...(managed ?? []).map((a) => ({
        id: a.id, artist_name: a.artist_name, handle: null, city: a.city,
        genre: a.genre, kind: "artist" as const, managedArtistId: a.id,
      })),
    ] };
  });

const QuerySchema = z.object({
  artistIds: z.array(z.string().uuid()).max(200),
  // -1 means "all months of the selected year"
  month: z.number().int().min(-1).max(11),
  year: z.number().int().min(2000).max(2100),
});

export const listArtistsAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => QuerySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    if (data.artistIds.length === 0) return { events: [] as AdminEvent[] };

    const { allowedAgendaOwnerIds } = await import("@/server/roles.server");
    const allowed = await allowedAgendaOwnerIds(context.userId);
    const roles = await (await import("@/server/roles.server")).getRoles(context.userId);
    let managedQuery = context.supabase.from("managed_artists")
      .select("id, artist_name, legacy_auth_user_id").in("id", data.artistIds);
    if (!roles.isMaster) managedQuery = managedQuery.eq("owner_admin_id", context.userId);
    const { data: managed, error: managedError } = await managedQuery;
    if (managedError) throw managedError;
    const managedIds = (managed ?? []).map((a) => a.id);
    const legacyIds = (managed ?? []).map((a) => a.legacy_auth_user_id).filter((id): id is string => !!id && allowed.has(id));
    const ids = Array.from(new Set([...data.artistIds.filter((id) => allowed.has(id)), ...legacyIds]));
    if (ids.length === 0 && managedIds.length === 0) return { events: [] as AdminEvent[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profiles = ids.length ? await supabaseAdmin.from("profiles").select("id, artist_name").in("id", ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;

    const { agendaRange, fetchAgendaEvents, mergeAgendaEvents } = await import("@/server/agendaEvents.server");
    const { timeMin, timeMax } = agendaRange(data.month, data.year);
    const manual = managedIds.length ? await context.supabase.from("managed_artist_events")
      .select("id, artist_id, title, starts_at, ends_at, venue, city, state, status, is_published, google_event_id")
      .in("artist_id", managedIds).gte("starts_at", timeMin.toISOString()).lt("starts_at", timeMax.toISOString()) : { data: [], error: null };
    if (manual.error) throw manual.error;

    const events = await fetchAgendaEvents(
      (profiles.data ?? []).map((p) => ({ id: p.id, artist_name: p.artist_name })),
      data.month,
      data.year,
    );
    const legacyByArtist = new Map((managed ?? []).filter((a) => a.legacy_auth_user_id).map((a) => [a.legacy_auth_user_id as string, a.id]));
    return { events: mergeAgendaEvents(manual.data ?? [], managed ?? [], events, legacyByArtist) as AdminEvent[] };
  });
