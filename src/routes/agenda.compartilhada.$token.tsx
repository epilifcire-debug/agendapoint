import { createFileRoute } from "@tanstack/react-router";
import { getSharedAgenda } from "@/lib/agendaShares.functions";
import { EfcsysSignature, EmptyState, Ingresso, accentFor, logoUrl } from "@/components/brand";

export const Route = createFileRoute("/agenda/compartilhada/$token")({
  loader: ({ params }) => getSharedAgenda({ data: { token: params.token } }),
  component: SharedAgendaPage,
  errorComponent: () => (
    <Shell title="Agenda compartilhada">
      <EmptyState title="Não foi possível carregar esta agenda">Atualize a página em instantes.</EmptyState>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell title="Agenda compartilhada">
      <EmptyState title="Link não encontrado">Confira se o link foi copiado inteiro.</EmptyState>
    </Shell>
  ),
  head: () => ({
    meta: [
      { title: "Agenda compartilhada — Agenda Point do Ingresso" },
      { name: "description", content: "Programação de shows compartilhada para consulta, somente leitura." },
      { property: "og:title", content: "Agenda compartilhada — Agenda Point do Ingresso" },
      { property: "og:description", content: "Programação de shows compartilhada para consulta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="pi-stage bg-stage text-white">
        <div className="pt-safe mx-auto grid w-full max-w-[720px] gap-3 px-5 pt-6 pb-8">
          <img src={logoUrl} alt="Point do Ingresso" className="h-9 w-9 rounded-full bg-white" />
          <span className="pi-strip mt-8 !h-2 !w-20" />
          <h1 className="poster-title text-[44px] sm:text-[64px]">{title}</h1>
          {subtitle && <p className="text-sm text-[#c9c1dd]">{subtitle}</p>}
        </div>
      </header>
      <main className="pb-safe mx-auto w-full max-w-[720px] px-4 py-8">
        {children}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-soft">
          <span>Somente leitura · Point do Ingresso</span>
          <EfcsysSignature />
        </footer>
      </main>
    </div>
  );
}

function SharedAgendaPage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    const msg =
      data.reason === "revoked"
        ? "Quem compartilhou revogou este link. Peça um novo a ele."
        : data.reason === "expired"
          ? "O prazo deste link acabou. Peça um novo a quem compartilhou."
          : "Confira se o link foi copiado inteiro.";
    return (
      <Shell title="Agenda compartilhada">
        <EmptyState title={data.reason === "revoked" ? "Link revogado" : data.reason === "expired" ? "Link expirado" : "Link não encontrado"}>{msg}</EmptyState>
      </Shell>
    );
  }

  const period = data.month === -1 ? `${data.year}` : `${MONTHS[data.month!]} de ${data.year}`;
  const events = data.events ?? [];

  return (
    <Shell title={`Agenda · ${period}`} subtitle={(data.artistNames ?? []).join(", ")}>
      {events.length === 0 ? (
        <EmptyState title="Nenhum show neste período">Quando houver shows cadastrados eles aparecem aqui.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {events.map((e) => (
            <li key={e.id}>
              <Ingresso start={e.start} end={(e as { end?: string }).end} title={e.summary} place={e.location} artist={e.artistName} accent={accentFor((e as { artistId?: string }).artistId ?? e.artistName)} />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function shortDate(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}
function weekday(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(iso)); }
  catch { return ""; }
}
function formatTime(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
  catch { return ""; }
}
