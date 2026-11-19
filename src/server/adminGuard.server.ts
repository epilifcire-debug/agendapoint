import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles, type RoleInfo } from "./roles.server";

/** Throws unless the current user has an administrative role (admin or admin_master). */
export async function assertAdmin(
  _supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<RoleInfo> {
  const roles = await getRoles(userId);
  if (!roles.isAdmin) throw new Error("Acesso restrito");
  return roles;
}

/** Throws unless the current user is the Admin Master. */
export async function assertMaster(userId: string): Promise<RoleInfo> {
  const roles = await getRoles(userId);
  if (!roles.isMaster) throw new Error("Acesso restrito");
  return roles;
}
