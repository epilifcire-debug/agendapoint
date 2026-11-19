import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, ExternalLink, Pencil, Plus, Trash2, Unplug, XCircle } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
  listCalendarEvents,
  startGoogleCalendarConnect,
  updateCalendarEvent,
} from "@/lib/googleCalendar.functions";
import { connectAppUser } from "@/lib/googleConnectClient";
import { amIAdmin } from "@/lib/admin.functions";
import { AdminDashboard } from "@/components/AdminDashboard";
import { PageHeader, StatCard } from "@/components/brand";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Painel — Agenda Point do Ingresso" },
      { name: "description", content: "Painel do artista na Agenda Point do Ingresso: agenda, integrações e resumo." },
       { property: "og:title", content: "Painel — Agenda Point do Ingresso" },
       { property: "og:description", content: "Acompanhe artistas e agendas na Agenda Point do Ingresso." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
});

type EventForm = { summary: string; location: string; startISO: string; endISO: string };
const emptyForm: EventForm = { summary: "", location: "", startISO: "", endISO: "" };

function DashboardPage() {
  const adminFn = useServerFn(amIAdmin);
  const adminQ = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  if (adminQ.data?.isAdmin) return <AdminDashboard />;
  return <ArtistDashboard />;
}

function ArtistDashboard() {
  const qc = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const connectedFn = useServerFn(isGoogleCalendarConnected);
  const listEventsFn = useServerFn(listCalendarEvents);
  const startConnectFn = useServerFn(startGoogleCalendarConnect);
  const disconnectFn = useServerFn(disconnectGoogleCalendar);
  const createEventFn = useServerFn(createCalendarEvent);
  const updateEventFn = useServerFn(updateCalendarEvent);
  const deleteEventFn = useServerFn(deleteCalendarEvent);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });
  const connected = useQuery({ queryKey: ["gcal-connected"], queryFn: () => connectedFn() });
  const events = useQuery({
    queryKey: ["gcal-events"],
    queryFn: () => listEventsFn(),
    enabled: connected.data?.connected === true,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyForm);
  const [calendarConsent, setCalendarConsent] = useState(false);

  const connectMut = useMutation({
    mutationFn: async () => {
      if (!calendarConsent) throw new Error("Confirme a leitura do aviso antes de continuar.");
      const result = await connectAppUser({
        connectorId: "google_calendar",
        start: (targetOrigin) => startConnectFn({ data: { targetOrigin, action: "connect", consent: true } }),
        verify: async () => (await connectedFn()).connected,
      });
      if (!result.success) throw new Error(result.error ?? "Falha na conexão");
    },
    onSuccess: () => {
      toast.success("Google Calendar conectado!");
      setCalendarConsent(false);
      qc.invalidateQueries({ queryKey: ["gcal-connected"] });
      qc.invalidateQueries({ queryKey: ["gcal-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Desconectado.");
      qc.invalidateQueries({ queryKey: ["gcal-connected"] });
      qc.invalidateQueries({ queryKey: ["gcal-events"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível revogar a conexão: ${e.message}`),
  });

  const updateMut = useMutation({
    mutationFn: (payload: EventForm & { eventId: string }) => updateEventFn({ data: payload }),
    onSuccess: () => {
      toast.success("Show atualizado!");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["gcal-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (eventId: string) => deleteEventFn({ data: { eventId } }),
    onSuccess: () => {
      toast.success("Show cancelado.");
      qc.invalidateQueries({ queryKey: ["gcal-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(e: { id: string; summary: string; start: string; end: string; location?: string }) {
    setEditing(e.id);
    setEditForm({
      summary: e.summary,
      location: e.location ?? "",
      startISO: toLocalInput(e.start),
      endISO: toLocalInput(e.end),
    });
  }

  const artist = profile.data?.artist_name || "Artista";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Painel" title={<>Olá, {artist}</>} description="Resumo da sua página e da sua agenda." />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Shows futuros" value={events.data?.events.length ?? (connected.data?.connected ? "…" : "0")} />
        <StatCard label="Google Calendar" value={connected.data?.connected ? "Conectado" : "Não conectado"} accent="var(--brand-turquoise)" />
        <StatCard label="Cidade" value={profile.data?.city || "Não informada"} accent="var(--brand-orange)" />
      </div>
      {connected.data?.needsReconnect && (
        <p role="status" className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          A conexão antiga com o Google Calendar precisa ser refeita nesta nova versão. Marque o aviso abaixo e clique em <strong>Conectar Google</strong>.
        </p>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Integração com Google Calendar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte sua conta para sincronizar automaticamente os shows na sua página pública.
            </p>
          </div>
          {connected.data?.connected ? (
            <button
              onClick={() => disconnectMut.mutate()}
              disabled={disconnectMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Unplug className="h-4 w-4" /> Desconectar
            </button>
          ) : (
            <button
              onClick={() => connectMut.mutate()}
              disabled={connectMut.isPending || !calendarConsent}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              <Calendar className="h-4 w-4" /> {connectMut.isPending ? "Abrindo…" : "Conectar Google"}
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {connected.data?.connected ? (
            <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sincronização ativa</>
          ) : (
            <><XCircle className="h-4 w-4 text-muted-foreground" /> Nenhuma conta conectada</>
          )}
        </div>
        {!connected.data?.connected && (
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              checked={calendarConsent}
              onChange={(event) => setCalendarConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              Ao conectar o Google Calendar, a Agenda Point do Ingresso acessará os dados necessários do calendário principal para sincronizar e divulgar os eventos definidos como shows. Você poderá desconectar a integração a qualquer momento. Li os{" "}
              <Link to="/termos" className="font-semibold text-primary underline">Termos</Link>{" "}
              e a{" "}
              <Link to="/privacidade" className="font-semibold text-primary underline">Política de Privacidade</Link>.
            </span>
          </label>
        )}
      </section>

      {connected.data?.connected && <CreateEventCard onCreate={async (data) => {
        await createEventFn({ data });
        toast.success("Show criado no Google Calendar!");
        qc.invalidateQueries({ queryKey: ["gcal-events"] });
      }} />}

      <section className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Próximos shows</h2>
          <span className="text-xs text-muted-foreground">Fonte: Google Calendar</span>
        </div>
        {!connected.data?.connected && (
          <p className="mt-4 text-sm text-muted-foreground">Conecte sua conta Google para ver os shows aqui.</p>
        )}
        {connected.data?.connected && events.isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
        )}
        {events.data && events.data.events.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum show futuro no seu calendário.</p>
        )}
        <ul className="mt-4 divide-y divide-border">
          {events.data?.events.map((e) => (
            <li key={e.id} className="py-3">
              {editing === e.id ? (
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    updateMut.mutate({ ...editForm, eventId: e.id });
                  }}
                >
                  <Input label="Título" value={editForm.summary} onChange={(v) => setEditForm((f) => ({ ...f, summary: v }))} required />
                  <Input label="Local" value={editForm.location} onChange={(v) => setEditForm((f) => ({ ...f, location: v }))} />
                  <Input type="datetime-local" label="Início" value={editForm.startISO} onChange={(v) => setEditForm((f) => ({ ...f, startISO: v }))} required />
                  <Input type="datetime-local" label="Fim" value={editForm.endISO} onChange={(v) => setEditForm((f) => ({ ...f, endISO: v }))} required />
                  <div className="md:col-span-2 flex gap-2">
                    <button type="submit" disabled={updateMut.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60">
                      {updateMut.isPending ? "Salvando…" : "Salvar"}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{e.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateRange(e.start, e.end)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(e)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Cancelar "${e.summary}"? Isso remove o evento do Google Calendar.`)) deleteMut.mutate(e.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Cancelar
                    </button>
                    {e.htmlLink && (
                      <a href={e.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function CreateEventCard({ onCreate }: { onCreate: (d: { summary: string; location?: string; description?: string; startISO: string; endISO: string }) => Promise<void> }) {
  const [form, setForm] = useState({ summary: "", location: "", startISO: "", endISO: "" });
  const [saving, setSaving] = useState(false);
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="section-title">Adicionar show</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cria um evento no seu Google Calendar.</p>
      <form
        className="mt-4 grid gap-3 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.summary || !form.startISO || !form.endISO) return;
          setSaving(true);
          try {
            await onCreate(form);
            setForm({ summary: "", location: "", startISO: "", endISO: "" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Input label="Título" value={form.summary} onChange={(v) => setForm((f) => ({ ...f, summary: v }))} required />
        <Input label="Local" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
        <Input type="datetime-local" label="Início" value={form.startISO} onChange={(v) => setForm((f) => ({ ...f, startISO: v }))} required />
        <Input type="datetime-local" label="Fim" value={form.endISO} onChange={(v) => setForm((f) => ({ ...f, endISO: v }))} required />
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60">
            <Plus className="h-4 w-4" /> {saving ? "Criando…" : "Criar show"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold">{label}</div>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
      />
    </label>
  );
}

function toLocalInput(iso: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch { return ""; }
}

function formatDateRange(startISO: string, endISO: string) {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const fmtDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    const fmtTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${fmtDate.format(s)} · ${fmtTime.format(s)} — ${fmtTime.format(e)}`;
  } catch {
    return startISO;
  }
}
