import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AgendaShare = {
  id: string;
  token: string;
  month: number;
  year: number;
  artists: Array<{ id: string; name: string }>;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  status: "active" | "revoked" | "expired";
};

export type SharedAgendaEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  artistName: string;
};

const CreateSchema = z.object({
  artistIds: z.array(z.string().uuid()).min(1).max(200),
  month: z.number().int().min(-1).max(11),
  year: z.number().int().min(2000).max(2100),
  expiresInDays: z.union([z.literal(0), z.literal(7), z.literal(15), z.literal(30)]),
});

export const createAgendaShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allowedArtistIds, newShareToken, shapeShares } = await import(
      "@/server/agendaShares.server"
    );

    const allowed = await allowedArtistIds(context.userId);
    const artistIds = data.artistIds.filter((id) => allowed.has(id));
    if (artistIds.length === 0) throw new Error("Nenhum artista válido para compartilhar");

    const expires_at =
      data.expiresInDays === 0
        ? null
        : new Date(Date.now() + data.expiresInDays * 86400000).toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("agenda_shares")
      .insert({
        token: newShareToken(),
        admin_id: context.userId,
        month: data.month,
        year: data.year,
        artist_ids: artistIds,
        expires_at,
      } as never)
      .select("*")
      .single();
    if (error) throw error;

    const [share] = await shapeShares([row]);
    return { share };
  });

export const listAgendaShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { shapeShares } = await import("@/server/agendaShares.server");

    const { data, error } = await supabaseAdmin
      .from("agenda_shares")
      .select("*")
      .eq("admin_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { shares: await shapeShares(data ?? []) };
  });

export const revokeAgendaShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/server/adminGuard.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("agenda_shares")
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("admin_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/** Public, read-only. Everything is derived from the stored share, never from the caller. */
export const getSharedAgenda = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ token: z.string().min(20).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { loadSharedAgenda } = await import("@/server/agendaShares.server");
    return loadSharedAgenda(data.token);
  });
