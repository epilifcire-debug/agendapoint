import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminPeer = {
  id: string;
  name: string;
  is_master: boolean;
  shared: boolean; // this peer can already read my agenda
};

/** Other administrators (admin / admin_master), excluding the caller. */
export const listAdminPeers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { adminUserIds, masterAdminIds } = await import("@/server/roles.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = Array.from(await adminUserIds()).filter((id) => id !== context.userId);
    if (ids.length === 0) return { peers: [] as AdminPeer[] };

    const masters = await masterAdminIds();
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, artist_name, contact_email")
      .in("id", ids);
    if (error) throw error;

    const { data: grants } = await supabaseAdmin
      .from("admin_agenda_access")
      .select("viewer_user_id")
      .eq("owner_user_id", context.userId);
    const shared = new Set((grants ?? []).map((g: any) => g.viewer_user_id as string));

    const peers: AdminPeer[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.artist_name || p.contact_email || "Administrador",
      is_master: masters.has(p.id),
      shared: shared.has(p.id),
    }));
    peers.sort((a, b) => a.name.localeCompare(b.name));
    return { peers };
  });

/** Grant read-only access to MY agenda for another administrator. */
export const grantAgendaAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ viewerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    if (data.viewerId === context.userId) throw new Error("Você já vê a sua própria agenda.");

    const { adminUserIds } = await import("@/server/roles.server");
    const admins = await adminUserIds();
    if (!admins.has(data.viewerId)) throw new Error("O destinatário não é um administrador.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_agenda_access")
      .upsert(
        { owner_user_id: context.userId, viewer_user_id: data.viewerId } as never,
        { onConflict: "owner_user_id,viewer_user_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

/** Revoke a previously granted read-only access to MY agenda. */
export const revokeAgendaAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ viewerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_agenda_access")
      .delete()
      .eq("owner_user_id", context.userId)
      .eq("viewer_user_id", data.viewerId);
    if (error) throw error;
    return { ok: true };
  });
