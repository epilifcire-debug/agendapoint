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
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/PwaRegister";
import { GOOGLE_ENABLED } from "@/lib/features";


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
  const connected = useQuery({ queryKey: ["gcal-connected"], queryFn: () => connectedFn(), enabled: GOOGLE_ENABLED });
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
    <div>
      <PageHeader title="Configurações" />
      {GOOGLE_ENABLED && connected.data?.needsReconnect && (
        <p role="status" className="mb-4 max-w-3xl rounded-[10px] border border-orange/40 bg-sheet px-4 py-3 text-sm">
          <span className="pi-status pi-status--draft mr-2">Atenção</span>A conexão antiga com o Google Calendar precisa ser refeita nesta versão. Marque o aviso e conecte de novo.
        </p>
      )}

      <section className="panel max-w-3xl divide-y divide-line">
        {GOOGLE_ENABLED && <div className="grid gap-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1">
              <h2 className="font-medium">Google Calendar</h2>
              <p className="text-sm text-ink-soft">Traz os shows do calendário do Google para a agenda. Opcional.</p>
            </div>
            <StatusPill ok={!!connected.data?.connected} okText="Conectado" offText="Não conectado" />
          </div>
          {!connected.data?.connected && (
            <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm text-ink-soft">
              <input type="checkbox" checked={calendarConsent} onChange={(event) => setCalendarConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--violet)]" />
              <span>
                Ao conectar, a Agenda Point acessa o calendário principal só para sincronizar e divulgar os eventos marcados como shows. Dá para desconectar quando quiser. Li os{" "}
                <Link to="/termos" className="font-medium text-violet underline">Termos</Link> e a{" "}
                <Link to="/privacidade" className="font-medium text-violet underline">Política de Privacidade</Link>.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {connected.data?.connected ? (
              <>
                <Button variant="outline" onClick={() => { setCalendarConsent(true); connectMut.mutate("popup"); }} disabled={connectMut.isPending}><RefreshCw /> Reautorizar Google</Button>
                <Button variant="ghost" className="text-pink-ink" disabled={disconnectMut.isPending} onClick={() => { if (window.confirm("Desconectar o Google Calendar? Os shows vindos do Google deixam de aparecer na agenda.")) disconnectMut.mutate(); }}><Unplug /> Desconectar Google</Button>
              </>
            ) : (
              <>
                <Button onClick={() => connectMut.mutate("popup")} disabled={connectMut.isPending}><CalIcon /> {connectMut.isPending ? "Abrindo o Google…" : "Conectar Google"}</Button>
                <Button variant="ghost" onClick={() => connectMut.mutate("tab")} disabled={connectMut.isPending}><ExternalLink /> Conectar em nova aba</Button>
              </>
            )}
          </div>
        </div>}

        <div className="flex flex-wrap items-center gap-3 px-5 py-5">
          <div className="min-w-[220px] flex-1">
            <h2 className="font-medium">Instalar no celular</h2>
            <p className="text-sm text-ink-soft">Abre a agenda como app, sem precisar do navegador. Se o botão não aparecer, use “Adicionar à tela inicial” no menu do navegador.</p>
          </div>
          <InstallAppButton label="Instalar app" />
        </div>

        {!isAdmin && (
          <div className="px-5 py-5">
            <h2 className="font-medium">Contas sociais</h2>
            <p className="text-sm text-ink-soft">Links da sua página pública. Para mudar, edite o Perfil.</p>
            <ul className="mt-3 divide-y divide-line">
              {socials.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="max-w-xs truncate text-sm text-ink-soft">{s.value || "Não preenchido"}</div>
                  </div>
                  <StatusPill ok={!!s.value} okText="Ativo" offText="Vazio" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {isMaster && <div className="mt-8 max-w-3xl"><AdminAccounts /></div>}
    </div>
  );
}

function StatusPill({ ok, okText, offText }: { ok: boolean; okText: string; offText: string }) {
  return <span className={`pi-status ${ok ? "pi-status--published" : "pi-status--hidden"}`}>{ok ? okText : offText}</span>;
}
