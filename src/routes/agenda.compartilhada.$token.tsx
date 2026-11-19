import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { getSharedAgenda } from "@/lib/agendaShares.functions";
import { BrandMark, EfcsysSignature } from "@/components/brand";

export const Route = createFileRoute("/agenda/compartilhada/$token")({
  loader: ({ params }) => getSharedAgenda({ data: { token: params.token } }),
  component: SharedAgendaPage,
  errorComponent: () => (
    <Shell title="Agenda compartilhada">
      <p className="text-sm text-muted-foreground">Não foi possível carregar esta agenda.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell title="Agenda compartilhada">
      <p className="text-sm text-muted-foreground">Link não encontrado.</p>
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
    <div className="public-agenda min-h-dvh bg-background text-foreground">
      <div className="pt-safe relative isolate overflow-hidden border-b border-border">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_20%_0%,color-mix(in_oklab,var(--brand-purple)_45%,transparent),transparent)]" />
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
          <BrandMark tone="inverse" />
          <p className="eyebrow mt-10 text-white/60">Agenda compartilhada</p>
          <h1 className="page-title mt-2 text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/65">{subtitle}</p>}
        </div>
      </div>
      <main className="pb-safe mx-auto w-full max-w-2xl px-5 py-8">
        {children}
        <div className="mt-14 flex justify-center"><EfcsysSignature /></div>
      </main>
    </div>
  );
}

function SharedAgendaPage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    const msg =
      data.reason === "revoked"
        ? "Este link de compartilhamento foi revogado."
        : data.reason === "expired"
          ? "Este link de compartilhamento expirou."
          : "Link inválido ou inexistente.";
    return (
      <Shell title="Agenda compartilhada">
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {msg}
        </div>
      </Shell>
    );
  }

  const period = data.month === -1 ? `${data.year}` : `${MONTHS[data.month!]} de ${data.year}`;
  const events = data.events ?? [];

  return (
    <Shell title={`Agenda — ${period}`} subtitle={(data.artistNames ?? []).join(" · ")}>
      {events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum evento/atividade neste período.
        </div>
      )}
      <ul className="space-y-3">
        {events.map((e) => (
          <li key={e.id} className="panel p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{shortDate(e.start)}</span>
              <span className="capitalize text-muted-foreground">{weekday(e.start)}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-xl font-bold">{formatTime(e.start)}</span>
              <h2 className="min-w-0 flex-1 break-words section-title">{e.summary}</h2>
            </div>
            {e.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {e.location}
              </p>
            )}
            <p className="mt-1 text-sm font-semibold">{e.artistName}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Visualização somente leitura · Agenda Point do Ingresso
      </p>
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
