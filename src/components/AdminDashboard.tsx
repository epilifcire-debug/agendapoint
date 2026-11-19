import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { getAdminStats } from "@/lib/adminArtists.functions";
import { listAgendaOwners, listArtistsAgenda } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { EmptyState, Ingresso, IngressoSkeleton, PageHeader, SummaryRows, accentFor } from "@/components/brand";
import { EventDrawer, eventStatusKind } from "@/components/EventDrawer";
import { GOOGLE_ENABLED } from "@/lib/features";

const today = () => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(new Date()).replace("-feira", "");
const monthName = () => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" }).format(new Date());
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AdminDashboard() {
  const statsFn = useServerFn(getAdminStats);
  const ownersFn = useServerFn(listAgendaOwners);
  const agendaFn = useServerFn(listArtistsAgenda);
  const [drawer, setDrawer] = useState(false);

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });
  const artists = useQuery({ queryKey: ["agenda-owners"], queryFn: () => ownersFn() });

  const ids = (artists.data?.owners ?? []).map((a) => a.id);
  const now = new Date();
  const year = now.getFullYear();

  const agenda = useQuery({
    queryKey: ["admin-dash-agenda", year, ids.join(",")],
    queryFn: () => agendaFn({ data: { artistIds: ids, month: -1, year } }),
    enabled: ids.length > 0,
  });

  const all = agenda.data?.events ?? [];
  const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });
  const events = all.filter((e) => monthKey.format(new Date(e.start)) === monthKey.format(now));
  const startOfToday = new Date(now.toDateString());
  const upcoming = all
    .filter((e) => { const d = new Date(e.start); return !Number.isNaN(d.getTime()) && d >= startOfToday && eventStatusKind(e) !== "cancelled"; })
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);
  const count = (kind: string) => events.filter((e) => eventStatusKind(e) === kind).length;
  const loading = artists.isLoading || (ids.length > 0 && agenda.isLoading);

  return (
    <div>
      <PageHeader
        title="Painel"
        description={cap(today())}
        actions={<Button onClick={() => setDrawer(true)}><Plus /> Adicionar show</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section>
          <h2 className="section-title mb-3">Próximos shows</h2>
          {loading ? (
            <IngressoSkeleton />
          ) : upcoming.length === 0 ? (
            <EmptyState title="Nenhum show marcado" actions={<Button onClick={() => setDrawer(true)}><Plus /> Adicionar show</Button>}>
              Os shows que você adicionar aparecem aqui e na página pública de cada artista.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Ingresso start={e.start} end={e.end} title={e.summary} place={e.location} artist={e.artistName} status={eventStatusKind(e)} accent={accentFor(e.artistId)} />
                </li>
              ))}
            </ul>
          )}
          <Link to="/agenda" className="mt-4 inline-block text-sm font-medium text-violet hover:underline">Ver agenda completa</Link>
        </section>

        <aside className="self-start">
          <SummaryRows
            title={cap(monthName())}
            rows={[
              ["Shows publicados", agenda.isLoading ? "…" : count("published")],
              ["Rascunhos", agenda.isLoading ? "…" : count("draft")],
              ["Cancelados", agenda.isLoading ? "…" : count("cancelled")],
              ["Artistas", stats.data?.totalArtists ?? "…"],
              ...(GOOGLE_ENABLED ? ([["Google Calendar", stats.data ? `${stats.data.connected} conectado${stats.data.connected === 1 ? "" : "s"}` : "…"]] as Array<[string, string | number]>) : []),
              ...(stats.data?.isMaster ? ([["Administradores", stats.data.mediumAdmins ?? 0]] as Array<[string, number]>) : []),
            ]}
          />
        </aside>
      </div>

      <EventDrawer open={drawer} onOpenChange={setDrawer} />
    </div>
  );
}
