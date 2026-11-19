/** Abre a autorização do Google Calendar em popup/aba e aguarda a conclusão. Sem segredos. */

export interface GoogleConnectResult {
  success: boolean;
  connectorId: string;
  error?: string;
}

export const GOOGLE_CONNECT_MESSAGE = {
  complete: "googleCalendarOAuthComplete",
  failed: "googleCalendarOAuthFailed",
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function connectAppUser(opts: {
  connectorId: string;
  start: (targetOrigin: string) => Promise<{ authorizationUrl: string }>;
  /** Checagem no servidor: true quando a conexão já foi salva. */
  verify?: () => Promise<boolean>;
  /** "tab" abre uma aba completa (útil quando popups são bloqueados). */
  openMode?: "popup" | "tab";
}): Promise<GoogleConnectResult> {
  const { connectorId, start, verify, openMode = "popup" } = opts;

  const popup =
    openMode === "tab"
      ? window.open("", "_blank")
      : window.open("", "google-oauth", "width=520,height=680");
  if (!popup) {
    return { success: false, connectorId, error: "Popup bloqueado. Permita popups e tente novamente." };
  }

  let settled = false;
  const completion = new Promise<GoogleConnectResult>((resolve) => {
    const finish = (result: GoogleConnectResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closeTimer);
      clearInterval(pollTimer);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.connectorId !== connectorId) return;
      if (data.type === GOOGLE_CONNECT_MESSAGE.complete) {
        try { popup.close(); } catch { /* noop */ }
        finish({ success: true, connectorId });
      } else if (data.type === GOOGLE_CONNECT_MESSAGE.failed) {
        try { popup.close(); } catch { /* noop */ }
        finish({ success: false, connectorId, error: data.error || "Não foi possível concluir a autorização." });
      }
    };
    window.addEventListener("message", onMessage);

    const pollTimer = setInterval(async () => {
      if (!verify || settled) return;
      try {
        if (await verify()) {
          try { popup.close(); } catch { /* noop */ }
          finish({ success: true, connectorId });
        }
      } catch { /* noop */ }
    }, 2500);

    const closeTimer = setInterval(async () => {
      if (settled || !popup.closed) return;
      clearInterval(closeTimer);
      if (verify) {
        for (let i = 0; i < 4; i++) {
          try {
            if (await verify()) return finish({ success: true, connectorId });
          } catch { /* noop */ }
          await sleep(1000);
        }
      }
      finish({ success: false, connectorId, error: "Janela fechada antes de concluir. Tente novamente." });
    }, 500);
  });

  try {
    const { authorizationUrl } = await start(window.location.origin);
    popup.location.href = authorizationUrl;
  } catch (e) {
    try { popup.close(); } catch { /* noop */ }
    return { success: false, connectorId, error: e instanceof Error ? e.message : "Falha ao iniciar a autorização" };
  }

  return await completion;
}
