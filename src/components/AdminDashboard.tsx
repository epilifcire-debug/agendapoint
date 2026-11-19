import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/brand";
import { getAdminStats, listArtistsForAdmin } from "@/lib/adminArtists.functions";
import { listArtistsAgenda } from "@/lib/admin.functions";

export function AdminDashboard() {
  const statsFn = useServerFn(getAdminStats);
  const artistsFn = useServerFn(listArtistsForAdmin);
  const agendaFn = useServerFn(listArtistsAgenda);

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });
  const artists = useQuery({ queryKey: ["admin-artists-full"], queryFn: () => artistsFn() });

  const ids = (artists.data?.artists ?? []).map((a) => a.id);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const agenda = useQuery({
    queryKey: ["admin-dash-agenda", month, year, ids.join(",")],
    queryFn: () => agendaFn({ data: { artistIds: ids, month, year } }),
    enabled: ids.length > 0,
  });

  const events = agenda.data?.events ?? [];
  const upcoming = events
    .filter((e) => {
      const d = new Date(e.start);
      return !isNaN(d.getTime()) && d >= now;
    })
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={stats.data?.isMaster ? "Administrador Master" : "Administrador"}
        title="Painel"
        description="Resumo geral dos artistas e das agendas."
        actions={
          <Link to="/artistas" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-brand">
            <Users className="h-4 w-4" /> Artistas
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Artistas"
          value={stats.data?.totalArtists ?? "…"}
          hint={<span className="tabular">{stats.data?.connected ?? "…"} conectados · {stats.data?.notConnected ?? "…"} não conectados</span>}
        />
        {stats.data?.isMaster && (
          <StatCard label="Administradores" value={stats.data?.mediumAdmins ?? "…"} hint="Não são contados como artistas." accent="var(--brand-turquoise)" />
        )}
        <StatCard label="Eventos do mês" value={agenda.isLoading ? "…" : events.length} accent="var(--brand-magenta)" />
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Próximos eventos</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Ainda neste mês, em ordem cronológica.</p>
          </div>
          <Link to="/agenda" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Agenda completa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {agenda.isLoading && (
          <div className="space-y-3" aria-busy>
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        )}
        {!agenda.isLoading && upcoming.length === 0 && (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Nenhum evento futuro neste mês" />
        )}

        <ul className="divide-y divide-border">
          {upcoming.map((e) => {
            const d = new Date(e.start);
            return (
              <li key={e.id} className="flex items-center gap-4 py-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <div className="text-center leading-none">
                    <div className="tabular font-display text-xl font-semibold">{String(d.getDate()).padStart(2, "0")}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">{fmtMonth(e.start)}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.summary}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="tabular">{fmtDate(e.start)} · {fmtTime(e.start)}</span>
                    {e.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{e.location}</span></span>}
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold sm:inline">{e.artistName}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function fmtMonth(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(iso)).replace(".", "");
  } catch {
    return "";
  }
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
function fmtTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}
