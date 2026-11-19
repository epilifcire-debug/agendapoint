import type { AgendaShare, SharedAgendaEvent } from "@/lib/agendaShares.functions";
import { fetchAgendaEvents } from "./agendaEvents.server";

export function newShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Artists this admin is allowed to share (artist-role profiles). */
export async function allowedArtistIds(_adminId: string): Promise<Set<string>> {
  const { artistUserIds } = await import("./roles.server");
  const allowed = await artistUserIds(_adminId);
  const { getRoles } = await import("./roles.server");
  const roles = await getRoles(_adminId);
  if (!roles.isAdmin) return new Set();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin.from("managed_artists").select("id");
  if (!roles.isMaster) query = query.eq("owner_admin_id", _adminId);
  const { data, error } = await query;
  if (error) throw error;
  for (const artist of data ?? []) allowed.add(artist.id);
  return allowed;
}

function statusOf(row: any): AgendaShare["status"] {
  if (row.revoked_at) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "active";
}

export async function shapeShares(rows: any[]): Promise<AgendaShare[]> {
  if (rows.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = Array.from(new Set(rows.flatMap((r) => (r.artist_ids ?? []) as string[])));
  const [{ data: profiles }, { data: managed }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, artist_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    supabaseAdmin.from("managed_artists").select("id, artist_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const nameById = new Map([...(profiles ?? []), ...(managed ?? [])].map((p) => [p.id, p.artist_name || "Artista"]));
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    month: r.month,
    year: r.year,
    artists: ((r.artist_ids ?? []) as string[]).map((id) => ({ id, name: nameById.get(id) ?? "Artista" })),
    created_at: r.created_at,
    expires_at: r.expires_at ?? null,
    revoked_at: r.revoked_at ?? null,
    status: statusOf(r),
  }));
}

export async function loadSharedAgenda(token: string): Promise<{
  ok: boolean;
  reason?: "not_found" | "revoked" | "expired";
  month?: number;
  year?: number;
  artistNames?: string[];
  events?: SharedAgendaEvent[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("agenda_shares")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!row) return { ok: false, reason: "not_found" };
  const status = statusOf(row);
  if (status !== "active") return { ok: false, reason: status === "revoked" ? "revoked" : "expired" };

  // Re-validate that the stored artists still belong to the sharing admin's scope.
  const allowed = await allowedArtistIds((row as any).admin_id as string);
  const artistIds = (((row as any).artist_ids ?? []) as string[]).filter((id) => allowed.has(id));
  if (artistIds.length === 0) {
    return { ok: true, month: (row as any).month, year: (row as any).year, artistNames: [], events: [] };
  }

  const [{ data: profiles, error: profileError }, { data: managed, error: managedError }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, artist_name").in("id", artistIds),
    supabaseAdmin.from("managed_artists").select("id, artist_name, legacy_auth_user_id, status").in("id", artistIds),
  ]);
  if (profileError) throw profileError;
  if (managedError) throw managedError;
  const published = (managed ?? []).filter((a) => a.status === "published");
  const managedIds = new Set((managed ?? []).map((a) => a.id));
  const legacyIds = published.map((a) => a.legacy_auth_user_id).filter((id): id is string => !!id);
  const legacyProfiles = legacyIds.length ? await supabaseAdmin.from("profiles").select("id, artist_name").in("id", legacyIds) : { data: [], error: null };
  if (legacyProfiles.error) throw legacyProfiles.error;
  const googleProfiles = Array.from(
    new Map(
      [
        ...(profiles ?? []).filter((profile) => !managedIds.has(profile.id)),
        ...(legacyProfiles.data ?? []),
      ].map((profile) => [profile.id, profile]),
    ).values(),
  );
  const { agendaRange, mergeAgendaEvents } = await import("./agendaEvents.server");
  const { timeMin, timeMax } = agendaRange((row as any).month, (row as any).year);
  const manual = published.length ? await supabaseAdmin.from("managed_artist_events")
    .select("id, artist_id, title, starts_at, ends_at, venue, city, state, status, is_published, google_event_id")
    .in("artist_id", published.map((a) => a.id)).eq("is_published", true)
    .gte("starts_at", timeMin.toISOString()).lt("starts_at", timeMax.toISOString()) : { data: [], error: null };
  if (manual.error) throw manual.error;
  const google = await fetchAgendaEvents(
    googleProfiles.map((p) => ({ id: p.id, artist_name: p.artist_name })),
    (row as any).month, (row as any).year,
  );
  const events = mergeAgendaEvents(manual.data ?? [], published,
    google, new Map(published.filter((a) => a.legacy_auth_user_id).map((a) => [a.legacy_auth_user_id as string, a.id])));

  return {
    ok: true,
    month: (row as any).month,
    year: (row as any).year,
    artistNames: Array.from(new Set([
      ...(profiles ?? []).filter((profile) => !managedIds.has(profile.id)),
      ...published,
    ].map((p) => p.artist_name || "Artista"))),
    events: events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      location: e.location,
      artistName: e.artistName,
    })),
  };
}
