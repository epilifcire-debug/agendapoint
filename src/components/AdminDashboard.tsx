import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { getAdminStats, listArtistsForAdmin } from "@/lib/adminArtists.functions";
import { listArtistsAgenda } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { EmptyState, Ingresso, PageHeader, SummaryRows, accentFor } from "@/components/brand";
import { EventDrawer, eventStatusKind } from "@/components/EventDrawer";
import { GOOGLE_ENABLED } from "@/lib/features";

const today = () => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" }).format(new Date()).replace("-feira", "");
const monthName = () => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" }).format(new Date());
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AdminDashboard() {
  const statsFn = useServerFn(getAdminStats);
  const artistsFn = useServerFn(listArtistsForAdmin);
  const agendaFn = useServerFn(listArtistsAgenda);
  const [drawer, setDrawer] = useState(false);

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
  const upcoming = events.filter((e) => {
    const d = new Date(e.start);
    return !Number.isNaN(d.getTime()) && d >= new Date(now.toDateString());
  }).slice(0, 5);
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
            <div className="grid gap-3" aria-busy>
              {[0, 1, 2].map((i) => <div key={i} className="h-[118px] animate-pulse rounded-2xl border border-line bg-sheet" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState title={`Nenhum show em ${monthName()}`} actions={<Button onClick={() => setDrawer(true)}><Plus /> Adicionar show</Button>}>
              Os shows que você adicionar aparecem aqui e na página pública de cada artista.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Ingresso start={e.start} title={e.summary} place={e.location} artist={e.artistName} status={eventStatusKind(e)} accent={accentFor(e.artistId)} />
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
