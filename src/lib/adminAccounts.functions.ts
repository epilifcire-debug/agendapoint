import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accountId = z.object({ id: z.string().uuid() });

async function requireMediumAdmin(id: string, callerId: string) {
  if (id === callerId) throw new Error("Você não pode alterar sua própria conta.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", id);
  if (error) throw error;
  if (!roles?.some((row) => row.role === "admin") || roles.some((row) => row.role === "admin_master")) {
    throw new Error("Administrador não encontrado.");
  }
  return supabaseAdmin;
}

export const listAdminAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertMaster } = await import("@/server/adminGuard.server");
    await assertMaster(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["admin", "admin_master"]);
    if (error) throw error;
    const masters = new Set((roles ?? []).filter((row) => row.role === "admin_master").map((row) => row.user_id));
    const ids = new Set((roles ?? []).filter((row) => row.role === "admin" && !masters.has(row.user_id)).map((row) => row.user_id));
    const accounts: { id: string; email: string; active: boolean; createdAt: string }[] = [];
    for (let page = 1; ; page++) {
      const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (usersError) throw usersError;
      for (const user of data.users) {
        if (ids.has(user.id)) accounts.push({
          id: user.id, email: user.email ?? "Sem e-mail", createdAt: user.created_at,
          active: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
        });
      }
      if (data.users.length < 100) break;
    }
    return accounts.sort((a, b) => a.email.localeCompare(b.email));
  });

export const inviteAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ email: z.string().trim().email().transform((email) => email.toLowerCase()) }).parse(input))
  .handler(async ({ context, data }) => {
    const { assertMaster } = await import("@/server/adminGuard.server");
    await assertMaster(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${(process.env.APP_URL || "https://agenda.efcsys.com").replace(/\/+$/, "")}/definir-senha`,
    });
    if (error) throw error;
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: invited.user.id, role: "admin" });
    if (roleError) {
      // Never delete a pre-existing account on a failed role assignment.
      throw new Error("Convite enviado, mas não foi possível conceder acesso administrativo. Contate o suporte antes de reenviar.");
    }
    return { ok: true };
  });

export const setAdminAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => accountId.extend({ active: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { assertMaster } = await import("@/server/adminGuard.server");
    await assertMaster(context.userId);
    const db = await requireMediumAdmin(data.id, context.userId);
    const { error } = await db.auth.admin.updateUserById(data.id, { ban_duration: data.active ? "none" : "876000h" });
    if (error) throw error;
    (await import("@/server/roles.server")).forgetRoles(data.id);
    return { ok: true };
  });

export const deleteAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => accountId.parse(input))
  .handler(async ({ context, data }) => {
    const { assertMaster } = await import("@/server/adminGuard.server");
    await assertMaster(context.userId);
    const db = await requireMediumAdmin(data.id, context.userId);
    // Child ownership is denormalized: update it explicitly after transferring the artist.
    const { error: transferError } = await db.from("managed_artists")
      .update({ owner_admin_id: context.userId }).eq("owner_admin_id", data.id);
    if (transferError) throw transferError;
    for (const table of ["managed_artist_events", "managed_artist_media"] as const) {
      const { error: childError } = await db.from(table)
        .update({ owner_admin_id: context.userId }).eq("owner_admin_id", data.id);
      if (childError) throw new Error("A transferência dos dados do artista não terminou. A conta não foi excluída; tente novamente.");
    }
    const { error } = await db.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Artistas transferidos ao Master, mas a exclusão da conta falhou. Tente novamente.");
    (await import("@/server/roles.server")).forgetRoles(data.id);
    return { ok: true };
  });