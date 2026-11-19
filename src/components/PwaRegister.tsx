import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/** Registra o service worker e avisa quando há nova versão (sem recarregar no meio de uma ação). */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      emit();
    };
    const onInstalled = () => {
      deferredPrompt = null;
      emit();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          const promptUpdate = (worker: ServiceWorker) =>
            toast("Nova versão disponível", {
              duration: Infinity,
              action: { label: "Atualizar", onClick: () => worker.postMessage({ type: "SKIP_WAITING" }) },
            });
          if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) promptUpdate(worker);
            });
          });
        })
        .catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** Botão "Instalar app": só aparece quando o navegador permite a instalação. */
export function InstallAppButton({ className, label = "Instalar app" }: { className?: string; label?: string }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const update = () => setAvailable(!!deferredPrompt);
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => undefined);
        deferredPrompt = null;
        emit();
      }}
      className={cn("inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-muted", className)}
    >
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
