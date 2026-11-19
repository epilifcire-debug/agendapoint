import { googleApiFetch } from "./googleOAuth.server";

export type AgendaEvent = {
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

export type ManualAgendaRow = {
  id: string; artist_id: string; title: string; starts_at: string; ends_at: string | null;
  venue: string | null; city: string | null; state: string | null;
  status: string; is_published: boolean; google_event_id: string | null;
};

export function mergeAgendaEvents(
  manual: ManualAgendaRow[],
  artists: Array<{ id: string; artist_name: string }>,
  google: AgendaEvent[],
  legacyByArtist: Map<string, string>,
): AgendaEvent[] {
  const names = new Map(artists.map((a) => [a.id, a.artist_name]));
  const manualEvents: AgendaEvent[] = manual.filter((row) => names.has(row.artist_id)).map((row) => ({
    id: `manual:${row.id}`, summary: row.title, start: row.starts_at,
    end: row.ends_at ?? row.starts_at, location: [row.venue, row.city, row.state].filter(Boolean).join(" · ") || undefined,
    city: row.city ?? undefined, state: row.state ?? undefined,
    status: row.status as AgendaEvent["status"], isPublished: row.is_published,
    artistId: row.artist_id, artistName: names.get(row.artist_id) ?? "Artista", origin: "manual",
  }));
  const googleEvents = google.map((event) => ({
    ...event, artistId: legacyByArtist.get(event.artistId) ?? event.artistId,
    artistName: names.get(legacyByArtist.get(event.artistId) ?? event.artistId) ?? event.artistName,
    origin: "google_calendar" as const, status: "scheduled" as const, isPublished: true,
  }));
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const isDuplicate = (googleEvent: AgendaEvent) => manual.some((row) => {
    if (row.artist_id !== googleEvent.artistId) return false;
    if (row.google_event_id && googleEvent.id.endsWith(`:${row.google_event_id}`)) return true;
    const googleIsAllDay = /^\d{4}-\d{2}-\d{2}$/.test(googleEvent.start);
    const sameCalendarDate = row.starts_at.slice(0, 10) === googleEvent.start.slice(0, 10);
    if (googleIsAllDay && sameCalendarDate && normalized(row.title) === normalized(googleEvent.summary)) return true;
    const manualTime = Date.parse(row.starts_at);
    const googleTime = Date.parse(googleEvent.start);
    return normalized(row.title) === normalized(googleEvent.summary) &&
      Number.isFinite(manualTime) && Number.isFinite(googleTime) && Math.abs(manualTime - googleTime) < 60000;
  });
  return [...manualEvents, ...googleEvents.filter((event) => !isDuplicate(event))]
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.summary.localeCompare(b.summary));
}

export function agendaRange(month: number, year: number) {
  const allYear = month === -1;
  const timeMin = allYear
    ? new Date(Date.UTC(year, 0, 1, 0, 0, 0))
    : new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const timeMax = allYear
    ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0))
    : new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return { timeMin, timeMax };
}

/** Fetches Google Calendar events for the given artists in the given month/year. */
export async function fetchAgendaEvents(
  artists: Array<{ id: string; artist_name: string | null }>,
  month: number,
  year: number,
): Promise<AgendaEvent[]> {
  const { timeMin, timeMax } = agendaRange(month, year);

  const results = await Promise.all(
    artists.map(async (p) => {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      try {
        const res = await googleApiFetch(p.id, `/calendar/v3/calendars/primary/events?${params.toString()}`);
        if (!res || !res.ok) return [] as AgendaEvent[];
        const body = (await res.json()) as { items?: Array<Record<string, any>> };
        return (body.items ?? []).map((e) => ({
          id: `${p.id}:${String(e.id)}`,
          summary: String(e.summary ?? "(sem título)"),
          start: e.start?.dateTime ?? e.start?.date ?? "",
          end: e.end?.dateTime ?? e.end?.date ?? "",
          location: e.location ?? undefined,
          htmlLink: e.htmlLink ?? undefined,
          artistId: p.id,
          artistName: p.artist_name || "Artista",
          origin: "google_calendar",
        })) as AgendaEvent[];
      } catch {
        return [] as AgendaEvent[];
      }
    }),
  );

  return results.flat().sort((a, b) => a.start.localeCompare(b.start));
}
