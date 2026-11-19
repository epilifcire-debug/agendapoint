import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, ExternalLink, MapPin, Search, Share2, ShieldAlert, X } from "lucide-react";
import { amIAdmin, listAgendaOwners, listArtistsAgenda } from "@/lib/admin.functions";
import { createAgendaShare, listAgendaShares, revokeAgendaShare } from "@/lib/agendaShares.functions";
import { grantAgendaAccess, listAdminPeers, revokeAgendaAccess } from "@/lib/adminAgendaAccess.functions";
import { PageHeader } from "@/components/brand";



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
  const isAdmin = admin.data?.isAdmin === true;

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

  if (admin.isLoading) return <EmptyState>Carregando…</EmptyState>;

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 section-title">Área restrita</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva para administradores. Sua agenda está disponível no Painel.
        </p>
      </div>
    );
  }

  const allArtists = (artists.data?.owners ?? []).map((o) => ({
    ...o,
    artist_name: o.kind === "self" ? "Minha agenda" : o.artist_name,
  }));

  const list = artistQ
    ? allArtists.filter((a) =>
        `${a.artist_name ?? ""} ${a.handle ?? ""} ${a.city ?? ""} ${a.genre ?? ""}`
          .toLowerCase()
          .includes(artistQ.toLowerCase()),
      )
    : allArtists;
  const allSelected = list.length > 0 && list.every((a) => selected.includes(a.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Agenda dos artistas"
        description="Selecione os artistas e o mês para ver os shows agendados."
        actions={
          <button
            onClick={() => { setLastToken(null); setShareOpen(true); }}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-brand transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Share2 className="h-4 w-4" /> Compartilhar agenda
          </button>
        }
      />

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-lg sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Compartilhar agenda</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gera um link somente leitura, sem necessidade de conta.
                </p>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-input p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">Período</dt>
                <dd className="font-semibold">{allMonths ? `Ano inteiro de ${year}` : `${MONTHS[month]} de ${year}`}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Artistas incluídos ({selected.length})</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {selected.length === 0 && <span className="text-xs text-muted-foreground">Nenhum artista selecionado</span>}
                  {allArtists
                    .filter((a) => selected.includes(a.id))
                    .map((a) => (
                      <span key={a.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {a.artist_name || a.handle || "Artista"}
                      </span>
                    ))}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold">Validade</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([0, 7, 15, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setExpiresInDays(d)}
                    className={`rounded-xl border px-3 py-3 text-xs font-semibold transition-colors ${
                      expiresInDays === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d === 0 ? "Sem expiração" : `${d} dias`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => createShare.mutate()}
              disabled={selected.length === 0 || createShare.isPending}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {createShare.isPending ? "Gerando…" : "Gerar link"}
            </button>
            {createShare.isError && (
              <p className="mt-2 text-xs text-destructive">Não foi possível gerar o link. Tente novamente.</p>
            )}

            {lastToken && (
              <div className="mt-4 rounded-xl border border-border bg-background p-3">
                <div className="break-all text-xs text-muted-foreground">{shareUrl(lastToken)}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl(lastToken));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch { /* ignore */ }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-input px-3 py-3 text-xs font-semibold hover:bg-muted"
                  >
                    <Copy className="h-4 w-4" /> {copied ? "Copiado!" : "Copiar link"}
                  </button>
                  <a
                    href={shareUrl(lastToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-input px-3 py-3 text-xs font-semibold hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4" /> Abrir visualização
                  </a>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="eyebrow">Links compartilhados</h3>
              {shares.isLoading && <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>}
              {!shares.isLoading && (shares.data?.shares ?? []).length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum link gerado ainda.</p>
              )}
              <ul className="mt-2 space-y-2">
                {(shares.data?.shares ?? []).map((s) => (
                  <li key={s.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {s.month === -1 ? `Ano ${s.year}` : `${MONTHS[s.month]} ${s.year}`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          s.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status === "active" ? "Ativo" : s.status === "revoked" ? "Revogado" : "Expirado"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.artists.length} artista(s) · criado em {shortDate(s.created_at)}
                      {s.expires_at ? ` · expira em ${shortDate(s.expires_at)}` : " · sem expiração"}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(shareUrl(s.token)).catch(() => {})}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input px-2 py-2.5 text-xs font-semibold hover:bg-muted"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </button>
                      <a
                        href={shareUrl(s.token)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input px-2 py-2.5 text-xs font-semibold hover:bg-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </a>
                      <button
                        onClick={() => revoke.mutate(s.id)}
                        disabled={s.status !== "active" || revoke.isPending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-2 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" /> Revogar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-input p-1">
            {([
              { v: "list", label: "Lista" },
              { v: "month", label: "Mês" },
              { v: "week", label: "Semana" },
            ] as const).filter((o) => !(allMonths && o.v === "week")).map((o) => (
              <button
                key={o.v}
                onClick={() => setView(o.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {view === "week" && currentWeek && !allMonths && (
            <div className="inline-flex items-center gap-2">
              <button
                onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                disabled={weekIndex === 0}
                className="rounded-lg border border-input p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold">{weekLabel(currentWeek)}</span>
              <button
                onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
                disabled={weekIndex >= weeks.length - 1}
                className="rounded-lg border border-input p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Mês">
            <select
              value={month}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMonth(v);
                setWeekIndex(0);
                if (v === -1 && view === "week") setView("list");
              }}
              className={inputCls}
            >
              <option value={-1}>Todos (ano inteiro)</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Ano">
            <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setWeekIndex(0); }} className={inputCls}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artista, título ou local" className={`${inputCls} pl-9`} />
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Cantor">
            <select
              className={inputCls}
              value={selected.length === 1 ? selected[0] : "all"}
              onChange={(e) => {
                const v = e.target.value;
                setSelected(v === "all" ? allArtists.map((a) => a.id) : [v]);
              }}
            >
              <option value="all">Todos os cantores</option>
              {allArtists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.artist_name || a.handle || "Artista"}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Cidade"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="Estado"><input className={inputCls} maxLength={2} value={state} onChange={(e) => setState(e.target.value)} /></Field>
          <Field label="Status"><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="scheduled">Agendado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></Field>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold">Artistas</div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setSelected((s) =>
                    allSelected
                      ? s.filter((id) => !list.some((a) => a.id === id))
                      : Array.from(new Set([...s, ...list.map((a) => a.id)])),
                  )
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                {allSelected ? "Desmarcar visíveis" : "Selecionar todos"}
              </button>
              <button
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
                className="text-xs font-semibold text-muted-foreground hover:underline disabled:opacity-40"
              >
                Limpar seleção
              </button>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={artistQ}
              onChange={(e) => setArtistQ(e.target.value)}
              placeholder="Buscar cantor por nome, cidade ou gênero"
              className={`${inputCls} pl-9`}
            />
          </div>
          {artists.isLoading && <p className="text-sm text-muted-foreground">Carregando artistas…</p>}
          {!artists.isLoading && list.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {artistQ ? "Nenhum cantor encontrado para essa busca." : "Nenhum artista cadastrado."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {list.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() =>
                    setSelected((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {a.artist_name || a.handle || "Artista"}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <AdminAccessSection />



      {allArtists.length === 0 && <EmptyState>Nenhum artista cadastrado.</EmptyState>}
       {allArtists.length > 0 && selected.length === 0 && <EmptyState>Selecione um artista para visualizar a agenda.</EmptyState>}
       {allArtists.length > 0 && selected.length > 0 && agenda.isLoading && <EmptyState>Carregando shows…</EmptyState>}
       {allArtists.length > 0 && selected.length > 0 && agenda.data && filtered.length === 0 && !agenda.isLoading && (
        <EmptyState>
          {view === "week"
            ? "Nenhum evento/atividade nesta semana."
            : allMonths
              ? "Nenhum evento/atividade encontrado neste ano."
              : "Nenhum evento/atividade encontrado para esse mês."}
        </EmptyState>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Dia</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Artista</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{shortDate(e.start)}</td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">{weekday(e.start)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTime(e.start)}</td>
                  <td className="px-4 py-3">
                    {e.htmlLink ? (
                      <a href={e.htmlLink} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                        {e.summary}
                      </a>
                    ) : (
                      <span className="font-semibold">{e.summary}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.location || "—"}</td>
                  <td className="px-4 py-3">{e.artistName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className={`space-y-3 ${view === "list" ? "hidden" : ""}`}>
        {filtered.map((e) => (
          <li key={e.id} className="panel p-4 transition-shadow hover:shadow-brand">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatDate(e.start)}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tracking-normal text-foreground">
                    {e.artistName}
                  </span>
                </div>
                <h3 className="mt-1 truncate section-title">{e.summary}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatTime(e.start)} — {formatTime(e.end)}</span>
                  {e.location && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>
                  )}
                </div>
              </div>
              {e.htmlLink && (
                <a href={e.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inputCls = "w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15";

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
    <section className="panel p-5">
      <h2 className="section-title">Compartilhar minha agenda com outro administrador</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O administrador escolhido passa a ver a sua agenda somente leitura. Você pode revogar quando quiser.
      </p>

      {peers.isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando administradores…</p>}
      {!peers.isLoading && all.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum outro administrador cadastrado.</p>
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
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {grant.isPending ? "Concedendo…" : "Conceder acesso"}
          </button>
        </div>
      )}
      {grant.isError && <p className="mt-2 text-xs text-destructive">Não foi possível conceder o acesso.</p>}

      {shared.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shared.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
              <span className="text-sm font-semibold">
                {p.name}{p.is_master ? " (master)" : ""}
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  Somente leitura
                </span>
              </span>
              <button
                onClick={() => revoke.mutate(p.id)}
                disabled={revoke.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
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


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold">{label}</div>
      {children}
    </label>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{children}</div>;
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
