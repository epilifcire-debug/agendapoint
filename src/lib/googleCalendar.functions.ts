import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEGAL_VERSION = "2026-09-17";
const GOOGLE_CALENDAR_PURPOSE =
  "Sincronizar e divulgar, na agenda pública, eventos do calendário principal definidos pelo usuário como shows.";

const TZ = "America/Sao_Paulo";

/**
 * datetime-local envia "2026-08-01T20:00" (hora de parede, sem fuso).
 * Nesse caso mandamos a string crua + timeZone para o Google interpretar
 * corretamente. Se já vier com fuso/Z, convertemos normalmente.
 */
function toGoogleDateTime(value: string): { dateTime: string; timeZone: string } {
  const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value.trim());
  if (naive) {
    const v = value.trim();
    return { dateTime: v.length === 16 ? `${v}:00` : v, timeZone: TZ };
  }
  return { dateTime: new Date(value).toISOString(), timeZone: TZ };
}

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      targetOrigin: z.string().url(),
      action: z.enum(["connect", "reauthorize"]),
      consent: z.literal(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { buildGoogleAuthorizationUrl } = await import("@/server/googleOAuth.server");
    const authorizationUrl = buildGoogleAuthorizationUrl(context.userId, data.targetOrigin);
    const { error: consentError } = await context.supabase.from("google_calendar_consents").insert({
      user_id: context.userId,
      policy_version: LEGAL_VERSION,
      purpose: GOOGLE_CALENDAR_PURPOSE,
      action: data.action,
    });
    if (consentError) throw consentError;
    return { authorizationUrl };
  });

export const completeGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { verifyOAuthState, exchangeGoogleCode } = await import("@/server/googleOAuth.server");
    verifyOAuthState(data.state, context.userId);
    await exchangeGoogleCode(context.userId, data.code);
    return { ok: true };
  });

export const isGoogleCalendarConnected = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { googleConnectionStatus } = await import("@/server/googleOAuth.server");
    const status = await googleConnectionStatus(context.userId);
    // "legacy": conexão criada pelo gateway do Lovable — precisa reconectar.
    return { connected: status === "connected", needsReconnect: status === "legacy" };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectGoogle } = await import("@/server/googleOAuth.server");
    await disconnectGoogle(context.userId);
    return { ok: true };
  });

export const listCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { googleApiFetch } = await import("@/server/googleOAuth.server");
    const params = new URLSearchParams({
      timeMin: new Date().toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "25",
    });
    const res = await googleApiFetch(context.userId, `/calendar/v3/calendars/primary/events?${params.toString()}`);
    if (!res) return { events: [] as Array<{ id: string; summary: string; start: string; end: string; location?: string; htmlLink?: string }> };
    if (!res.ok) throw new Error(`Google Calendar list failed (${res.status}): ${await res.text()}`);
    const body = (await res.json()) as { items?: Array<Record<string, any>> };
    const events = (body.items ?? []).map((e) => ({
      id: String(e.id),
      summary: String(e.summary ?? "(sem título)"),
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      location: e.location ?? undefined,
      htmlLink: e.htmlLink ?? undefined,
    }));
    return { events };
  });

const CreateEventSchema = z.object({
  summary: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  startISO: z.string().min(1),
  endISO: z.string().min(1),
});

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { googleApiFetch } = await import("@/server/googleOAuth.server");
    const res = await googleApiFetch(context.userId, `/calendar/v3/calendars/primary/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: data.summary,
        location: data.location,
        description: data.description,
        start: toGoogleDateTime(data.startISO),
        end: toGoogleDateTime(data.endISO),
      }),
    });
    if (!res) throw new Error("Google Calendar não conectado");
    if (!res.ok) throw new Error(`Criar evento falhou (${res.status}): ${await res.text()}`);
    return await res.json();
  });

const UpdateEventSchema = CreateEventSchema.extend({ eventId: z.string().min(1) });

export const updateCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { googleApiFetch } = await import("@/server/googleOAuth.server");
    const res = await googleApiFetch(context.userId, `/calendar/v3/calendars/primary/events/${encodeURIComponent(data.eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: data.summary,
        location: data.location,
        description: data.description,
        start: toGoogleDateTime(data.startISO),
        end: toGoogleDateTime(data.endISO),
      }),
    });
    if (!res) throw new Error("Google Calendar não conectado");
    if (!res.ok) throw new Error(`Atualizar evento falhou (${res.status}): ${await res.text()}`);
    return await res.json();
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => z.object({ eventId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { googleApiFetch } = await import("@/server/googleOAuth.server");
    const res = await googleApiFetch(context.userId, `/calendar/v3/calendars/primary/events/${encodeURIComponent(data.eventId)}`, { method: "DELETE" });
    if (!res) throw new Error("Google Calendar não conectado");
    if (!res.ok && res.status !== 410) throw new Error(`Cancelar evento falhou (${res.status}): ${await res.text()}`);
    return { ok: true };
  });

const AvatarSchema = z.object({ avatar_url: z.string().trim().min(1).max(2000) });

export const setAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AvatarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
