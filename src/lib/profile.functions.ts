import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IMAGES_BUCKET, resolveStoredImage } from "@/lib/storagePath";

const ProfileUpdateSchema = z.object({
  artist_name: z.string().trim().min(1).max(80),
  handle: z.string().trim().min(2).max(40).regex(/^[a-z0-9_.-]+$/i).optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
  avatar_url: z.string().trim().max(2000).optional().nullable(),
  cover_url: z.string().trim().max(2000).optional().nullable(),
  cover_fit: z.enum(["cover", "contain"]).optional(),
  cover_zoom: z.number().int().min(50).max(300).optional(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  show_whatsapp: z.boolean().optional(),
  contact_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().nullable(),
  youtube: z.string().trim().max(200).optional().nullable(),
  spotify: z.string().trim().max(200).optional().nullable(),
  tiktok: z.string().trim().max(200).optional().nullable(),
  soundcloud: z.string().trim().max(200).optional().nullable(),
  twitter: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  genre: z.string().trim().max(80).optional().nullable(),
});

const SIGNED_TTL = 60 * 60 * 24; // 24h

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    async function display(value?: string | null) {
      const { path, url } = resolveStoredImage(value);
      if (url) return url;
      if (!path) return null;
      const { data: signed } = await context.supabase.storage
        .from(IMAGES_BUCKET)
        .createSignedUrl(path, SIGNED_TTL);
      return signed?.signedUrl ?? null;
    }

    return {
      ...data,
      avatar_display_url: await display(data.avatar_url),
      cover_display_url: await display((data as { cover_url?: string | null }).cover_url),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    // id is always forced to the authenticated user: nobody can edit another artist.
    const payload = { ...data, id: context.userId, updated_at: new Date().toISOString() };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

const CoverSchema = z.object({ cover_url: z.string().trim().max(2000).nullable() });

export const setCoverUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoverSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ cover_url: data.cover_url || null, updated_at: new Date().toISOString() } as never)
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

