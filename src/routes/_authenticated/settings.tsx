import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Unplug, Calendar as CalIcon, Instagram, Youtube, Music2, ExternalLink } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { amIAdmin } from "@/lib/admin.functions";
import {
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
  startGoogleCalendarConnect,
} from "@/lib/googleCalendar.functions";
import { connectAppUser } from "@/lib/googleConnectClient";
import { AdminAccounts } from "@/components/AdminAccounts";
import { PageHeader } from "@/components/brand";


export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Configurações — Agenda Point do Ingresso" },
      { name: "description", content: "Status das suas conexões e integrações na Agenda Point do Ingresso." },
      { property: "og:title", content: "Configurações — Agenda Point do Ingresso" },
      { property: "og:description", content: "Conexões e configurações da Agenda Point do Ingresso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SettingsPage() {
  const qc = useQueryClient();
  const profileFn = useServerFn(getMyProfile);
  const connectedFn = useServerFn(isGoogleCalendarConnected);
  const startFn = useServerFn(startGoogleCalendarConnect);
  const disconnectFn = useServerFn(disconnectGoogleCalendar);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });
  const connected = useQuery({ queryKey: ["gcal-connected"], queryFn: () => connectedFn() });
  const adminFn = useServerFn(amIAdmin);
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  const isAdmin = admin.data?.isAdmin === true;
  const isMaster = admin.data?.isMaster === true;
  const [calendarConsent, setCalendarConsent] = useState(false);

  const connectMut = useMutation({
    mutationFn: async (openMode: "popup" | "tab" = "popup") => {
      if (!calendarConsent) throw new Error("Confirme a leitura do aviso antes de continuar.");
      const action = connected.data?.connected ? "reauthorize" : "connect";
      const result = await connectAppUser({
        connectorId: "google_calendar",
        openMode,
        start: (targetOrigin) => startFn({ data: { targetOrigin, action, consent: true } }),
        verify: async () => (await connectedFn()).connected,
      });
      if (!result.success) throw new Error(result.error ?? "Falha na conexão");
    },
    onSuccess: () => {
      toast.success("Google Calendar conectado!");
      setCalendarConsent(false);
      qc.invalidateQueries({ queryKey: ["gcal-connected"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Desconectado.");
      qc.invalidateQueries({ queryKey: ["gcal-connected"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível revogar a conexão: ${e.message}`),
  });

  const socials = [
    { key: "instagram", label: "Instagram", icon: Instagram, value: profile.data?.instagram },
    { key: "tiktok", label: "TikTok", icon: Music2, value: (profile.data as any)?.tiktok },
    { key: "twitter", label: "Twitter / X", icon: Music2, value: (profile.data as any)?.twitter },
    { key: "youtube", label: "YouTube", icon: Youtube, value: profile.data?.youtube },
    { key: "spotify", label: "Spotify", icon: Music2, value: profile.data?.spotify },
    { key: "soundcloud", label: "SoundCloud", icon: Music2, value: (profile.data as any)?.soundcloud },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Conta" title="Configurações" description="Conexões, integrações e status da sua conta." />
      {connected.data?.needsReconnect && (
        <p role="status" className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          A conexão antiga com o Google Calendar precisa ser refeita nesta nova versão. Marque o aviso e conecte novamente.
        </p>
      )}

      <section className="panel p-5 sm:p-6">
        <h2 className="section-title">Integrações</h2>
        <div className="mt-4 divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-turquoise/15 p-2.5 text-brand-turquoise"><CalIcon className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">Google Calendar</div>
                <StatusPill ok={!!connected.data?.connected} okText="Conectado" offText="Não conectado" />
              </div>
            </div>
            <div className="w-full rounded-lg border border-border bg-muted/40 p-3">
              <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
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
            </div>
            <div className="flex flex-wrap gap-2">
              {connected.data?.connected ? (
                <>
                  <button
                    onClick={() => connectMut.mutate("popup")}
                    disabled={connectMut.isPending || !calendarConsent}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" /> Reautorizar
                  </button>
                  <button
                    onClick={() => disconnectMut.mutate()}
                    disabled={disconnectMut.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    <Unplug className="h-4 w-4" /> Desconectar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => connectMut.mutate("popup")}
                    disabled={connectMut.isPending || !calendarConsent}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
                  >
                    <CalIcon className="h-4 w-4" /> {connectMut.isPending ? "Abrindo…" : "Conectar"}
                  </button>
                  <button
                    onClick={() => connectMut.mutate("tab")}
                    disabled={connectMut.isPending || !calendarConsent}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    <ExternalLink className="h-4 w-4" /> Conectar em nova aba
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {!isAdmin && (
      <section className="panel p-5 sm:p-6">
        <h2 className="section-title">Contas sociais</h2>
        <p className="mt-1 text-sm text-muted-foreground">Links exibidos na sua página pública. Edite no Perfil.</p>
        <ul className="mt-4 divide-y divide-border">
          {socials.map((s) => {
            const Icon = s.icon;
            const filled = !!s.value;
            return (
              <li key={s.key} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    {filled ? (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{s.value}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Não configurado</div>
                    )}
                  </div>
                </div>
                <StatusPill ok={filled} okText="Ativo" offText="Vazio" />
              </li>
            );
          })}
        </ul>
      </section>
      )}
      {isMaster && <AdminAccounts />}
    </div>
  );
}

function StatusPill({ ok, okText, offText }: { ok: boolean; okText: string; offText: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {okText}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> {offText}</span>
  );
}
