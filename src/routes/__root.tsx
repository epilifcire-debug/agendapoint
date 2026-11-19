import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { THEME_SCRIPT, logoUrl } from "@/components/brand";
import { PwaRegister } from "@/components/PwaRegister";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <img src={logoUrl} alt="" className="mx-auto h-16 w-16 rounded-full bg-white" />
        <p className="eyebrow mt-8 text-primary">Erro 404</p>
        <h1 className="page-title mt-2">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">O endereço não existe ou foi movido.</p>
        <Link to="/" className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <p className="eyebrow text-destructive">Algo deu errado</p>
        <h1 className="page-title mt-2">Esta página não carregou</h1>
        <p className="mt-3 text-sm text-muted-foreground">Tente novamente em instantes ou volte para o início.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold hover:bg-muted">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#140c26" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Agenda Point" },
      { name: "application-name", content: "Agenda Point" },
      { title: "Agenda Point do Ingresso — Plataforma de agenda de artistas" },
      {
        name: "description",
        content:
          "Plataforma de gerenciamento e divulgação de agendas de artistas. Artistas, bandas, DJs e produtores organizam e disponibilizam publicamente suas agendas de shows e eventos, com informações profissionais, contatos e links para redes sociais.",
      },
      { property: "og:title", content: "Agenda Point do Ingresso — Plataforma de agenda de artistas" },
      {
        property: "og:description",
        content:
          "Plataforma de gerenciamento e divulgação de agendas de artistas. Artistas, bandas, DJs e produtores organizam e disponibilizam publicamente suas agendas de shows e eventos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Agenda Point do Ingresso" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors position="top-center" toastOptions={{ className: "font-sans" }} />
      <PwaRegister />
    </QueryClientProvider>
  );
}
