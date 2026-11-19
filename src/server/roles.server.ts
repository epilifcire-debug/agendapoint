/**
 * Single source of truth for the role hierarchy:
 *  - artist       : owns a public page + own agenda
 *  - admin        : "administrador médio", owns its own agenda + sees artists
 *  - admin_master : global administrative view, still NOT allowed into other admins' agendas
 *
 * An administrator is NEVER counted or listed as an artist.
 */

export type RoleInfo = {
  isAdmin: boolean; // admin OR admin_master (any administrative access)
  isMaster: boolean;
  isMediumAdmin: boolean;
  isArtist: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Roles are read several times per request (guard + permission helpers). A short
// cache avoids repeating the two Supabase round-trips; a block still takes effect
// within ROLE_TTL_MS.
const ROLE_TTL_MS = 15_000;
const roleCache = new Map<string, { at: number; value: Promise<RoleInfo> }>();

export function getRoles(userId: string): Promise<RoleInfo> {
  const hit = roleCache.get(userId);
  if (hit && Date.now() - hit.at < ROLE_TTL_MS) return hit.value;
  const value = loadRoles(userId).catch((error) => { roleCache.delete(userId); throw error; });
  roleCache.set(userId, { at: Date.now(), value });
  if (roleCache.size > 500) roleCache.delete(roleCache.keys().next().value as string);
  return value;
}

/** Call after changing someone's roles or blocking an account. */
export function forgetRoles(userId?: string) {
  if (userId) roleCache.delete(userId); else roleCache.clear();
}

async function loadRoles(userId: string): Promise<RoleInfo> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set((data ?? []).map((r: any) => String(r.role)));
  // An existing session must not retain administrative access after a Master blocks the account.
  if (roles.has("admin") || roles.has("admin_master")) {
    const { data: account, error } = await db.auth.admin.getUserById(userId);
    if (error || !account.user || (account.user.banned_until && new Date(account.user.banned_until).getTime() > Date.now())) {
      return { isAdmin: false, isMaster: false, isMediumAdmin: false, isArtist: false };
    }
  }
  const isMaster = roles.has("admin_master");
  const isMediumAdmin = roles.has("admin") && !isMaster;
  return {
    isAdmin: isMaster || roles.has("admin"),
    isMaster,
    isMediumAdmin,
    isArtist: roles.has("artist") && !isMaster && !roles.has("admin"),
  };
}

/** Ids of users that hold any administrative role. */
export async function adminUserIds(): Promise<Set<string>> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("user_id, role").in("role", ["admin", "admin_master"]);
  return new Set((data ?? []).map((r: any) => r.user_id as string));
}

/** Ids of medium administrators (admin, but not admin_master). */
export async function mediumAdminIds(): Promise<Set<string>> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("user_id, role").in("role", ["admin", "admin_master"]);
  const masters = new Set(
    (data ?? []).filter((r: any) => r.role === "admin_master").map((r: any) => r.user_id as string),
  );
  const admins = new Set(
    (data ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id as string),
  );
  for (const m of masters) admins.delete(m);
  return admins;
}

export async function masterAdminIds(): Promise<Set<string>> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("user_id").eq("role", "admin_master");
  return new Set((data ?? []).map((r: any) => r.user_id as string));
}

/** Ids of real artists: artist role AND no administrative role. */
export async function artistUserIds(viewerId: string): Promise<Set<string>> {
  const db = await admin();
  const roles = await getRoles(viewerId);
  if (!roles.isAdmin) return new Set();
  const { data } = await db.from("user_roles").select("user_id").eq("role", "artist");
  const artists = new Set((data ?? []).map((r: any) => r.user_id as string));
  for (const a of await adminUserIds()) artists.delete(a);
  const { data: managed, error } = await db.from("managed_artists")
    .select("legacy_auth_user_id, owner_admin_id").not("legacy_auth_user_id", "is", null);
  if (error) throw error;
  return new Set((managed ?? [])
    .filter((row) => roles.isMaster || row.owner_admin_id === viewerId)
    .map((row) => row.legacy_auth_user_id)
    .filter((id): id is string => typeof id === "string" && artists.has(id)));
}

/** Admin agendas explicitly shared (read-only) with this viewer. */
export async function sharedAgendaOwnersFor(viewerId: string): Promise<Set<string>> {
  const db = await admin();
  const { data } = await db
    .from("admin_agenda_access")
    .select("owner_user_id")
    .eq("viewer_user_id", viewerId);
  return new Set((data ?? []).map((r: any) => r.owner_user_id as string));
}

/**
 * Every agenda owner this user may read:
 *  - legacy artists assigned to this administrator (or all for Master)
 *  - their own agenda
 *  - other administrators' agendas ONLY when explicitly shared with them
 * Being an admin (or admin_master) grants nothing over another admin's agenda.
 */
export async function allowedAgendaOwnerIds(viewerId: string): Promise<Set<string>> {
  const allowed = await artistUserIds(viewerId);
  allowed.add(viewerId);
  for (const id of await sharedAgendaOwnersFor(viewerId)) allowed.add(id);
  return allowed;
}
