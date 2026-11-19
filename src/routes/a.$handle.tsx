import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { getPublicAgenda, type PublicEvent } from "@/lib/publicAgenda.functions";
import logoUrl from "@/assets/point-do-ingresso-logo.png";
import { socialLinks } from "@/lib/share";
import { getManagedSlugForLegacyHandle } from "@/lib/managedPublic.functions";

export const Route = createFileRoute("/a/$handle")({
  loader: async ({ params }) => {
    const managed = await getManagedSlugForLegacyHandle({ data: { handle: params.handle } });
    if (managed.slug) throw redirect({ to: "/artistas/$slug", params: { slug: managed.slug }, replace: true });
    if (managed.managed) return { profile: null, events: [] };
    return getPublicAgenda({ data: { handle: params.handle } });
  },
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.artist_name ?? "Agenda do artista";
    const desc = `Confira as próximas datas e shows de ${name} na Agenda Point do Ingresso.`;
    return {
      meta: [
        { title: `${name} — Próximos shows | Agenda Point do Ingresso` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Próximos shows` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicAgendaPage,
});

type PublicProfile = {
  artist_name: string;
  handle: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_fit?: "cover" | "contain" | null;
  cover_zoom?: number | null;
  city: string | null;
  genre: string | null;
  bio: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  soundcloud?: string | null;
  show_whatsapp?: boolean | null;
  whatsapp_phone?: string | null;
};

function PublicAgendaPage() {
  const { profile, events } = Route.useLoaderData() as {
    profile: PublicProfile | null;
    events: PublicEvent[];
  };
  const [month, setMonth] = useState<string>("all");
  const [year, setYear] = useState<string>("all");


  const years = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => {
      const d = new Date(e.start);
      if (!isNaN(d.getTime())) set.add(d.getFullYear());
    });
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        const d = new Date(e.start);
        if (isNaN(d.getTime())) return false;
        if (month !== "all" && d.getMonth() !== Number(month)) return false;
        if (year !== "all" && d.getFullYear() !== Number(year)) return false;
        return true;
      }),
    [events, month, year],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((e) => {
      const d = new Date(e.start);
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map.set(label, [...(map.get(label) ?? []), e]);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const avatar = profile?.avatar_url || logoUrl;
  const cover = profile?.cover_url ?? null;
  const coverFit = profile?.cover_fit === "contain" ? "contain" : "cover";
  const coverZoom = Math.min(300, Math.max(50, profile?.cover_zoom ?? 100)) / 100;

  return (
    <div className="public-agenda relative min-h-dvh bg-background text-foreground">
      {cover && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <img
            src={cover}
            alt=""
            className="h-full w-full object-center opacity-[0.14]"
            style={{ objectFit: coverFit, transform: `scale(${coverZoom})`, transformOrigin: "center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/90" />
        </div>
      )}
      <div className="relative z-10">
      <div className="pt-safe bg-[radial-gradient(80%_70%_at_50%_0%,color-mix(in_oklab,var(--brand-purple)_50%,transparent),transparent)] pt-14 pb-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
          <img
            src={avatar}
            alt={profile ? `Foto de ${profile.artist_name}` : "Artista"}
            className="h-24 w-24 rounded-full border-4 border-background object-cover shadow-brand"
          />
          <h1 className="display-title mt-5 text-[clamp(2.25rem,1.6rem+3vw,3.5rem)]">
            {profile?.artist_name ?? "Artista não encontrado"}
          </h1>
          {profile?.city && <p className="mt-1 text-sm text-muted-foreground">{profile.city}</p>}

          {profile && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {socialLinks({ ...profile, whatsapp: null }).map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card/60 px-4 text-xs font-semibold backdrop-blur transition-colors hover:bg-card"
                >
                  {s.label}
                </a>
              ))}
              {profile.show_whatsapp === true && profile.whatsapp_phone && (
                <a
                  href={`https://wa.me/${normalizeBrPhone(profile.whatsapp_phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:border-emerald-400"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

      </div>

      <main className="mx-auto max-w-2xl px-4 pb-16">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 section-title">
            <CalendarDays className="h-5 w-5" /> Próximos shows
          </h2>
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
              <option value="all">Todos os meses</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
              <option value="all">Todos os anos</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum show encontrado para esse período.
          </div>
        )}

        <div className="space-y-7">
          {groups.map(([label, list]) => (
            <section key={label}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</h3>
              <ul className="space-y-3">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-4 panel p-3 transition-colors hover:border-accent/50"
                  >
                    <img src={avatar} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-base font-bold">{e.summary}</h4>
                      {e.location && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {e.location}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-accent px-2 py-1 text-xs font-bold uppercase text-accent-foreground">
                          {formatBadge(e.start)}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">{formatTime(e.start)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" /> Powered by Agenda Point do Ingresso
        </footer>
      </main>
      </div>
    </div>
  );
}

const selectCls =
  "rounded-full border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function normalizeBrPhone(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatBadge(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
      .format(new Date(iso))
      .replace(/\./g, "")
      .toUpperCase();
  } catch {
    return "";
  }
}
function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}
