import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeGoogleCalendarConnect } from "@/lib/googleCalendar.functions";
import { GOOGLE_CONNECT_MESSAGE } from "@/lib/googleConnectClient";

export const Route = createFileRoute("/oauth/google/return")({
  ssr: false,
  component: OAuthReturn,
  head: () => ({
    meta: [
      { title: "Conectando Google Calendar — Agenda Point do Ingresso" },
      { name: "description", content: "Finalizando a conexão com o Google Calendar na Agenda Point do Ingresso." },
       { property: "og:title", content: "Conectando Google Calendar — Agenda Point do Ingresso" },
       { property: "og:description", content: "Finalizando a conexão com o Google Calendar." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CONNECTOR_ID = "google_calendar";

function OAuthReturn() {
  const [message, setMessage] = useState("Finalizando conexão…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "complete" | "failed", error?: string) => {
      const payload = { type: GOOGLE_CONNECT_MESSAGE[type], connectorId: CONNECTOR_ID, error };
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
        window.close();
      } else {
        // Aberto em aba: volta para as configurações.
        window.setTimeout(() => window.location.replace("/settings"), 1200);
      }
    };

    const oauthError = params.get("error");
    if (oauthError) {
      const msg = oauthError === "access_denied" ? "Autorização cancelada." : `Google: ${oauthError}`;
      setMessage(msg);
      notify("failed", msg);
      return;
    }
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setMessage("Resposta do Google incompleta.");
      notify("failed", "Resposta do Google incompleta.");
      return;
    }
    void completeGoogleCalendarConnect({ data: { code, state } })
      .then(() => {
        setMessage("Google Calendar conectado. Você já pode fechar esta janela.");
        notify("complete");
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Não foi possível concluir a conexão.";
        setMessage(msg);
        notify("failed", msg);
      });
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden />
        <p className="text-sm text-ink-soft" role="status">{message}</p>
      </div>
    </main>
  );
}
