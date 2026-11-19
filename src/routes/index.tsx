import { createFileRoute, Link } from "@tanstack/react-router";
import { EfcsysSignature, Ingresso, logoUrl } from "@/components/brand";
import { InstallAppButton } from "@/components/PwaRegister";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
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
      { property: "og:url", content: "https://agenda.efcsys.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agenda.efcsys.com/" }],
  }),
});

function Home() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <section className="pi-stage bg-stage text-white">
        <div className="pt-safe mx-auto grid max-w-6xl gap-10 px-5 pb-14 md:grid-cols-[1.1fr_1fr] md:items-center md:pb-20">
          <div className="flex flex-col gap-5">
            <header className="flex items-center justify-between py-5">
              <span className="flex items-center gap-2.5">
                <img src={logoUrl} alt="" className="h-10 w-10 rounded-full bg-white" />
                <span className="text-sm font-medium">Point do Ingresso</span>
              </span>
              <Link to="/login" className="pi-ghost md:hidden">Entrar</Link>
            </header>
            <span className="pi-strip mt-6" />
            <h1 className="poster-title text-[64px] sm:text-[88px] lg:text-[112px]">A agenda oficial dos seus artistas</h1>
            <p className="max-w-md text-lg text-[#c9c1dd]">Cadastre os shows, publique a agenda e mande um link só para o público acompanhar.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/login" className="inline-flex h-12 items-center rounded-md bg-white px-5 font-medium text-[#1e0b3f] hover:bg-[#f3f0fa]">Entrar na gestão</Link>
              <InstallAppButton className="h-12 border-white/25 px-4 text-white hover:border-white/60" />
            </div>
          </div>
          <div className="hidden gap-3 md:grid" aria-label="Exemplo de agenda">
            {[
              { d: "2026-11-21T22:00:00-03:00", t: "Festival Luar", l: "Arena Norte, Fortaleza – CE", a: "pink" as const, r: "-rotate-2" },
              { d: "2026-11-22T21:30:00-03:00", t: "Show acústico", l: "Casa do Samba, Recife – PE", a: "teal" as const, r: "rotate-1" },
              { d: "2026-11-28T20:00:00-03:00", t: "Forró de Rua", l: "Praça do Ferreira, Fortaleza – CE", a: "orange" as const, r: "-rotate-1" },
            ].map((e) => <div key={e.t} className={e.r}><Ingresso start={e.d} title={e.t} place={e.l} accent={e.a} /></div>)}
            <p className="text-xs text-[#c9c1dd]">Exemplo ilustrativo.</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-2">
        <section>
          <h2 className="section-title">Para o administrador</h2>
          <p className="mt-2 text-ink-soft">Cada artista com perfil, fotos, contatos e agenda. Você publica só o que quiser divulgar e acompanha tudo no painel.</p>
        </section>
        <section>
          <h2 className="section-title">Para o público</h2>
          <p className="mt-2 text-ink-soft">Uma página por artista com os próximos shows, mapa, link do ingresso e botão de compartilhar, pronta para o link da bio.</p>
        </section>
      </main>

      <footer className="pb-safe border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-soft">
          <nav className="flex flex-wrap gap-5">
            <Link to="/termos" className="hover:text-ink">Termos</Link>
            <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
            <a href="mailto:caixaspoint@gmail.com" className="hover:text-ink">Contato: caixaspoint@gmail.com</a>
          </nav>
          <EfcsysSignature />
        </div>
      </footer>
    </div>
  );
}
