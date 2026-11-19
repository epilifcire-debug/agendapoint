import { createFileRoute, Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, Search, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDrawer, eventStatusKind } from "@/components/EventDrawer";
import { amIAdmin, listAgendaOwners, listArtistsAgenda } from "@/lib/admin.functions";
import { createAgendaShare, listAgendaShares, revokeAgendaShare } from "@/lib/agendaShares.functions";
import { grantAgendaAccess, listAdminPeers, revokeAgendaAccess } from "@/lib/adminAgendaAccess.functions";
import { EmptyState, IconButton, Ingresso, IngressoSkeleton, PageHeader, accentFor } from "@/components/brand";



export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
  head: () => ({
    meta: [
      { title: "Agenda dos artistas — Agenda Point do Ingresso" },
      { name: "description", content: "Painel administrativo da Agenda Point do Ingresso: veja a agenda dos artistas por mês." },
       { property: "og:title", content: "Agenda dos artistas — Agenda Point do Ingresso" },
       { property: "og:description", content: "Consulte a agenda dos artistas por mês na Agenda Point do Ingresso." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AgendaPage() {
  const adminFn = useServerFn(amIAdmin);
  const ownersFn = useServerFn(listAgendaOwners);
  const agendaFn = useServerFn(listArtistsAgenda);

  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  // Queries start together with the role check; the server enforces access anyway.
  const isAdmin = admin.data?.isAdmin !== false;

  const artists = useQuery({
    queryKey: ["agenda-owners"],
    queryFn: () => ownersFn(),
    enabled: isAdmin,
  });


  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth());
  const [year, setYear] = useState<number>(now.getFullYear());
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [q, setQ] = useState("");
  const [artistQ, setArtistQ] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"month" | "week" | "list">("list");
  const [weekIndex, setWeekIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!selectionInitialized && artists.data) {
      setSelected(artists.data.owners.map((owner) => owner.id));
      setSelectionInitialized(true);
    }
  }, [artists.data, selectionInitialized]);

  const qc = useQueryClient();
  const sharesFn = useServerFn(listAgendaShares);
  const createShareFn = useServerFn(createAgendaShare);
  const revokeShareFn = useServerFn(revokeAgendaShare);

  const shares = useQuery({
    queryKey: ["agenda-shares"],
    queryFn: () => sharesFn(),
    enabled: isAdmin,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeShareFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda-shares"] }),
  });
  const [expiresInDays, setExpiresInDays] = useState<0 | 7 | 15 | 30>(7);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createShare = useMutation({
    mutationFn: () =>
      createShareFn({ data: { artistIds: selected, month, year, expiresInDays } }),
    onSuccess: (res: any) => {
      setLastToken(res?.share?.token ?? null);
      qc.invalidateQueries({ queryKey: ["agenda-shares"] });
    },
  });


  const agenda = useQuery({
    queryKey: ["admin-agenda", month, year, selected.join(","), artists.data?.owners?.map((o) => o.id).join(",")],
    queryFn: () => agendaFn({ data: { artistIds: selected, month, year } }),
    enabled: isAdmin && selectionInitialized && selected.length > 0,
  });

  const allMonths = month === -1;
  const weeks = useMemo(() => weeksOfMonth(year, allMonths ? 0 : month), [year, month, allMonths]);
  const currentWeek = weeks[Math.min(weekIndex, weeks.length - 1)];

  const filtered = useMemo(() => {
    if (selected.length === 0) return [];
    let list = agenda.data?.events ?? [];
    if (city) list = list.filter((e) => (e.city ?? e.location ?? "").toLowerCase().includes(city.toLowerCase()));
    if (state) list = list.filter((e) => (e.state ?? "").toLowerCase() === state.trim().toLowerCase());
    if (status) list = list.filter((e) => e.status === status);
    if (view === "week" && currentWeek && !allMonths) {
      list = list.filter((e) => {
        const d = new Date(e.start);
        return !isNaN(d.getTime()) && d >= currentWeek.start && d < currentWeek.end;
      });
    }
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(
      (e) =>
        e.summary.toLowerCase().includes(s) ||
        (e.location ?? "").toLowerCase().includes(s) ||
        e.artistName.toLowerCase().includes(s),
    );
  }, [agenda.data, selected.length, q, view, currentWeek, allMonths, city, state, status]);

  if (!isAdmin) {
    return <EmptyState title="Área dos administradores">Sua agenda está no Painel.</EmptyState>;
  }

  const allArtists = (artists.data?.owners ?? []).map((o) => ({
    ...o,
    artist_name: o.kind === "self" ? "Minha agenda" : o.artist_name,
  }));
  const groups = filtered.reduce<Array<{ key: string; label: string; items: typeof filtered }>>((acc, e) => {
    const d = new Date(e.start);
    const key = Number.isNaN(d.getTime()) ? "?" : `${d.getFullYear()}-${d.getMonth()}`;
    const label = Number.isNaN(d.getTime()) ? "Sem data" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const g = acc.find((x) => x.key === key);
    if (g) g.items.push(e); else acc.push({ key, label, items: [e] });
    return acc;
  }, []);
  const hasFilters = !!(q || city || state || status) || selected.length !== allArtists.length;
  const clearFilters = () => { setQ(""); setCity(""); setState(""); setStatus(""); setSelected(allArtists.map((x) => x.id)); };
  const periodLabel = allMonths ? `${year}` : `${MONTHS[month].toLowerCase()} de ${year}`;

  return (
    <div>
      <PageHeader
        title="Agenda dos artistas"
        description="Shows de todos os artistas, em ordem de data."
        actions={<>
          <Button variant="outline" onClick={() => { setLastToken(null); setShareOpen(true); }}><Share2 /> Compartilhar agenda</Button>
          <Button onClick={() => setDrawer(true)}><Plus /> Adicionar show</Button>
        </>}
      />

      <div className="mb-2 flex flex-wrap items-end gap-3">
        <Field label="Mês">
          <select value={month} onChange={(e) => { const v = Number(e.target.value); setMonth(v); setWeekIndex(0); if (v === -1 && view === "week") setView("list"); }} className={inputCls}>
            <option value={-1}>Ano inteiro</option>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </Field>
        <Field label="Ano">
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setWeekIndex(0); }} className={inputCls}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Artista">
          <select className={inputCls} value={selected.length === 1 ? selected[0] : "all"} onChange={(e) => { const v = e.target.value; setSelected(v === "all" ? allArtists.map((x) => x.id) : [v]); }}>
            <option value="all">Todos</option>
            {allArtists.map((x) => <option key={x.id} value={x.id}>{x.artist_name || x.handle || "Artista"}</option>)}
          </select>
        </Field>
        <Field label="Situação">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas</option><option value="scheduled">Agendado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option>
          </select>
        </Field>
        <Field label="Buscar" className="min-w-[200px] flex-1">
          <span className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Show, local ou artista" className={`${inputCls} w-full pl-9`} />
          </span>
        </Field>
      </div>
      <details className="mb-6 text-sm">
        <summary className="inline-flex h-10 cursor-pointer items-center font-medium text-violet">Mais filtros</summary>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <Field label="Cidade"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="UF"><input className={`${inputCls} w-20`} maxLength={2} value={state} onChange={(e) => setState(e.target.value)} /></Field>
          {!allMonths && <Field label="Visualizar">
            <span className="inline-flex rounded-md border border-line bg-sheet p-1">
              {(["list", "week"] as const).map((v) => <button type="button" key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`h-9 rounded px-3 text-sm font-medium ${view === v ? "bg-paper text-ink" : "text-ink-soft"}`}>{v === "list" ? "Mês" : "Semana"}</button>)}
            </span>
          </Field>}
          {view === "week" && currentWeek && !allMonths && (
            <span className="inline-flex items-center gap-1 pb-1">
              <IconButton label="Semana anterior" onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} disabled={weekIndex === 0}><ChevronLeft className="h-[18px] w-[18px]" /></IconButton>
              <span className="text-sm font-medium">{weekLabel(currentWeek)}</span>
              <IconButton label="Próxima semana" onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))} disabled={weekIndex >= weeks.length - 1}><ChevronRight className="h-[18px] w-[18px]" /></IconButton>
            </span>
          )}
        </div>
      </details>

      {artists.isLoading || (!selectionInitialized && !!artists.data?.owners.length) || (selected.length > 0 && agenda.isLoading) ? (
        <IngressoSkeleton />
      ) : allArtists.length === 0 ? (
        <EmptyState title="Nenhum artista cadastrado" actions={<Button asChild><Link to="/artistas"><Plus /> Cadastrar artista</Link></Button>}>Cadastre um artista para montar a agenda.</EmptyState>
      ) : selected.length === 0 ? (
        <EmptyState title="Nenhum artista selecionado" actions={<Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}>Escolha um artista ou todos para ver os shows.</EmptyState>
      ) : agenda.isError ? (
        <EmptyState title="Não foi possível carregar a agenda" actions={<Button variant="outline" onClick={() => agenda.refetch()}>Tentar de novo</Button>}>Verifique a conexão e tente de novo.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={view === "week" ? "Nenhum show nesta semana" : `Nenhum show em ${periodLabel}`}
          actions={<><Button onClick={() => setDrawer(true)}><Plus /> Adicionar show</Button>{hasFilters && <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}</>}
        >
          Os shows adicionados aqui aparecem na página pública de cada artista.
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mb-6">
            <h2 className="mb-3 flex items-center gap-3 font-poster text-[22px] font-semibold uppercase after:h-px after:flex-1 after:bg-line">{g.label}</h2>
            <ul className="grid gap-3">
              {g.items.map((e) => (
                <li key={e.id}>
                  <Ingresso
                    start={e.start}
                    end={e.end}
                    title={e.summary}
                    place={e.location}
                    artist={e.artistName}
                    status={eventStatusKind(e)}
                    accent={accentFor(e.artistId)}
                    actions={e.htmlLink ? <a href={e.htmlLink} target="_blank" rel="noreferrer" aria-label={`Abrir ${e.summary} no Google Calendar`} title="Abrir no Google Calendar" className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"><ExternalLink className="h-[18px] w-[18px]" /></a> : undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <details className="panel mt-10 p-5 sm:p-6">
        <summary className="section-title cursor-pointer">Acesso de outros administradores</summary>
        <AdminAccessSection />
      </details>

      <EventDrawer open={drawer} onOpenChange={setDrawer} defaultArtistId={selected.length === 1 ? selected[0] : undefined} />

      <Dialog.Root open={shareOpen} onOpenChange={setShareOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#110a22]/50" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] animate-drawer flex-col border-l border-line bg-sheet text-ink outline-none">
            <header className="flex items-start justify-between gap-3 border-b border-line py-3 pr-3 pl-5">
              <div>
                <Dialog.Title className="section-title">Compartilhar agenda</Dialog.Title>
                <Dialog.Description className="text-sm text-ink-soft">Link somente leitura, sem precisar de conta.</Dialog.Description>
              </div>
              <Dialog.Close className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink" aria-label="Fechar"><X className="h-5 w-5" /></Dialog.Close>
            </header>
            <div className="grid content-start gap-5 overflow-y-auto p-5">
              <dl className="panel divide-y divide-line text-sm">
                <div className="flex justify-between gap-3 px-4 py-3"><dt className="text-ink-soft">Período</dt><dd className="font-medium">{allMonths ? `Ano de ${year}` : `${MONTHS[month]} de ${year}`}</dd></div>
                <div className="px-4 py-3"><dt className="text-ink-soft">Artistas ({selected.length})</dt><dd className="mt-1">{allArtists.filter((x) => selected.includes(x.id)).map((x) => x.artist_name || x.handle || "Artista").join(", ") || "Nenhum"}</dd></div>
              </dl>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Validade do link</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([0, 7, 15, 30] as const).map((d) => (
                    <button type="button" key={d} onClick={() => setExpiresInDays(d)} aria-pressed={expiresInDays === d} className={`h-11 rounded-md border text-sm font-medium ${expiresInDays === d ? "border-violet bg-violet/10 text-violet" : "border-line text-ink-soft hover:border-ink-soft"}`}>
                      {d === 0 ? "Sem prazo" : `${d} dias`}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Button onClick={() => { if (selected.length === 0) { toast.error("Escolha ao menos um artista no filtro Artista."); return; } createShare.mutate(); }} disabled={createShare.isPending}>
                {createShare.isPending ? "Gerando…" : "Gerar link"}
              </Button>
              {createShare.isError && <p className="text-sm text-pink-ink">Não foi possível gerar o link. Tente de novo.</p>}
              {lastToken && (
                <div className="panel grid gap-3 p-4">
                  <p className="break-all text-sm text-ink-soft">{shareUrl(lastToken)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl(lastToken)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão */ } }}><Copy /> {copied ? "Link copiado" : "Copiar link"}</Button>
                    <Button asChild variant="outline"><a href={shareUrl(lastToken)} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button>
                  </div>
                </div>
              )}
              <section>
                <h3 className="mb-2 text-sm font-medium">Links gerados</h3>
                {shares.isLoading && <p className="text-sm text-ink-soft">Carregando…</p>}
                {!shares.isLoading && (shares.data?.shares ?? []).length === 0 && <p className="text-sm text-ink-soft">Nenhum link gerado ainda.</p>}
                <ul className="panel divide-y divide-line">
                  {(shares.data?.shares ?? []).map((sh) => (
                    <li key={sh.id} className="grid gap-2 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{sh.month === -1 ? `Ano ${sh.year}` : `${MONTHS[sh.month]} ${sh.year}`}</span>
                        <span className={`pi-status ${sh.status === "active" ? "pi-status--published" : "pi-status--hidden"}`}>{sh.status === "active" ? "Ativo" : sh.status === "revoked" ? "Revogado" : "Expirado"}</span>
                      </div>
                      <p className="text-xs text-ink-soft">{sh.artists.length} artista(s) · criado em {shortDate(sh.created_at)}{sh.expires_at ? ` · expira em ${shortDate(sh.expires_at)}` : " · sem prazo"}</p>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(shareUrl(sh.token)).then(() => toast.success("Link copiado.")).catch(() => {})}><Copy /> Copiar</Button>
                        <Button size="sm" variant="ghost" asChild><a href={shareUrl(sh.token)} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button>
                        {sh.status === "active" && <Button size="sm" variant="ghost" className="text-pink-ink" disabled={revoke.isPending} onClick={() => { if (window.confirm(`Revogar o link de ${sh.month === -1 ? `${sh.year}` : `${MONTHS[sh.month]} ${sh.year}`}? Quem tiver o link perde o acesso.`)) revoke.mutate(sh.id); }}><X /> Revogar</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

const inputCls = "min-h-11 rounded-md border border-line bg-sheet px-3 py-2.5 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20";

/** Share MY own agenda (read-only) with another administrator. */
function AdminAccessSection() {
  const qc = useQueryClient();
  const peersFn = useServerFn(listAdminPeers);
  const grantFn = useServerFn(grantAgendaAccess);
  const revokeFn = useServerFn(revokeAgendaAccess);
  const [viewerId, setViewerId] = useState("");

  const peers = useQuery({ queryKey: ["admin-peers"], queryFn: () => peersFn() });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-peers"] });
    qc.invalidateQueries({ queryKey: ["agenda-owners"] });
  };
  const grant = useMutation({
    mutationFn: (id: string) => grantFn({ data: { viewerId: id } }),
    onSuccess: () => { setViewerId(""); invalidate(); },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { viewerId: id } }),
    onSuccess: invalidate,
  });

  const all = peers.data?.peers ?? [];
  const available = all.filter((p) => !p.shared);
  const shared = all.filter((p) => p.shared);

  return (
    <section className="mt-3">
      <p className="text-sm text-ink-soft">
        O administrador escolhido passa a ver a sua agenda somente leitura. Você pode revogar quando quiser.
      </p>

      {peers.isLoading && <p className="mt-3 text-sm text-ink-soft">Carregando administradores…</p>}
      {!peers.isLoading && all.length === 0 && (
        <p className="mt-3 text-sm text-ink-soft">Nenhum outro administrador cadastrado.</p>
      )}

      {available.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select value={viewerId} onChange={(e) => setViewerId(e.target.value)} className={inputCls}>
            <option value="">Selecione um administrador…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.is_master ? " (master)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => viewerId && grant.mutate(viewerId)}
            disabled={!viewerId || grant.isPending}
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-violet disabled:opacity-50"
          >
            {grant.isPending ? "Concedendo…" : "Conceder acesso"}
          </button>
        </div>
      )}
      {grant.isError && <p className="mt-2 text-xs text-pink-ink">Não foi possível conceder o acesso.</p>}

      {shared.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shared.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3">
              <span className="text-sm">
                <span className="font-medium">{p.name}{p.is_master ? " (Master)" : ""}</span>
                <span className="ml-2 text-ink-soft">vê sua agenda, sem editar</span>
              </span>
              <button
                onClick={() => { if (window.confirm(`Revogar o acesso de ${p.name} à sua agenda?`)) revoke.mutate(p.id); }}
                disabled={revoke.isPending}
                className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-pink-ink hover:bg-paper disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" /> Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatDate(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}
function formatTime(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
  catch { return ""; }
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Week = { start: Date; end: Date };

function weeksOfMonth(year: number, month: number): Week[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: Week[] = [];
  const cursor = new Date(first);
  cursor.setDate(first.getDate() - first.getDay()); // domingo
  while (cursor <= last) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 7);
    weeks.push({ start, end });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function weekLabel(w: Week) {
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  const last = new Date(w.end);
  last.setDate(last.getDate() - 1);
  return `${fmt.format(w.start)} — ${fmt.format(last)}`;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);

function shortDate(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}
function weekday(iso: string) {
  try { return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(iso)); }
  catch { return ""; }
}

function shareUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://agenda.efcsys.com";
  return `${origin}/agenda/compartilhada/${token}`;
}
