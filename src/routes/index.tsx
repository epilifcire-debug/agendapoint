import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Calendar, Link2, QrCode, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark, EfcsysSignature, ThemeToggle, logoUrl } from "@/components/brand";
import { COLOR_BENDS_PURPLE, ColorBends } from "@/components/ColorBends";
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
    <div className="min-h-dvh bg-background text-foreground">
      <Hero />
      <main>
        <Purpose />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="pt-safe relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <BrandMark tone="inverse" />
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
          <a href="#recursos" className="transition-colors hover:text-white">Recursos</a>
          <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
          <a href="#publico" className="transition-colors hover:text-white">Para quem é</a>
        </nav>
        <Link to="/login" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-brand-ink transition-transform hover:scale-[1.03] active:scale-95">
          Entrar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="public-agenda relative isolate overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_70%_10%,color-mix(in_oklab,var(--brand-purple)_45%,transparent),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-90">
        <ColorBends {...COLOR_BENDS_PURPLE} />
      </div>
      <div aria-hidden className="bg-grain absolute inset-0 -z-10" />
      <Header />
      <div className="mx-auto grid max-w-6xl gap-14 px-5 pt-10 pb-20 md:grid-cols-[1.2fr_1fr] md:items-center md:pt-16 md:pb-28">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand-orange" /> Plataforma de agenda de artistas
          </span>
          <h1 className="display-title mt-6 text-white">
            A página oficial dos seus <span className="text-brand-gradient">shows</span>, sempre em dia.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
            Organize perfis e eventos dos artistas em um só lugar. O público acompanha shows, contatos e redes sociais em uma página bonita e fácil de compartilhar.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:scale-[1.02] active:scale-95">
              Acessar gestão <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#como-funciona" className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Como funciona
            </a>
            <InstallAppButton className="h-12 border-white/15 px-5 text-white hover:bg-white/10" />
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6 text-white">
            {[
              { k: "Um link", v: "por artista" },
              { k: "Google", v: "Calendar opcional" },
              { k: "QR Code", v: "para cartazes" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="font-display text-lg font-semibold">{s.k}</dt>
                <dd className="text-xs text-white/55">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const shows = [
    { day: "12", month: "AGO", time: "22h", title: "Festival Luar", place: "Arena Norte · Fortaleza, CE", accent: "var(--brand-magenta)" },
    { day: "18", month: "AGO", time: "21h30", title: "Show acústico", place: "Casa do Samba · Recife, PE", accent: "var(--brand-turquoise)" },
    { day: "26", month: "AGO", time: "23h", title: "Noite de estreia", place: "Marina Park · Fortaleza, CE", accent: "var(--brand-orange)" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[340px] animate-rise [animation-delay:120ms]" aria-label="Exemplo ilustrativo de página de artista">
      <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl backdrop-blur-xl">
        <div className="overflow-hidden rounded-[1.85rem] bg-card">
          <div className="relative h-28 bg-brand-gradient">
            <span className="absolute top-3 right-3 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/90 uppercase">Exemplo</span>
          </div>
          <div className="px-5 pb-5">
            <img src={logoUrl} alt="" className="relative -mt-9 h-[72px] w-[72px] rounded-full border-4 border-card bg-white" />
            <p className="mt-3 font-display text-xl font-semibold">Nome do Artista</p>
            <p className="text-xs text-muted-foreground">Forró · Fortaleza, CE</p>
            <p className="eyebrow mt-5">Próximos shows</p>
            <ul className="mt-3 space-y-2">
              {shows.map((s) => (
                <li key={s.title} className="flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: s.accent }}>
                    <div className="text-center leading-none">
                      <div className="tabular font-display text-base font-bold">{s.day}</div>
                      <div className="text-[8px] font-bold tracking-wider">{s.month}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{s.place}</div>
                  </div>
                  <span className="tabular text-[11px] font-semibold text-muted-foreground">{s.time}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              <Share2 className="h-3.5 w-3.5" /> Compartilhar agenda
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Purpose() {
  const points = [
    { title: "Para quem faz show", body: "Cantores, bandas, DJs, humoristas, instrumentistas e grupos musicais com perfis e shows organizados por um administrador." },
    { title: "Um link para tudo", body: "Troque prints, stories e posts avulsos por uma página profissional em agenda.efcsys.com/artistas/seu-nome." },
    { title: "Google Calendar opcional", body: "Organize as apresentações na agenda interna. Conectar o Google Calendar é opcional para o administrador." },
    { title: "Mais tempo no palco", body: "Menos trabalho manual atualizando redes sociais. Mais tempo tocando, produzindo e falando com fãs e contratantes." },
  ];
  return (
    <section id="proposito" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
        <div className="md:sticky md:top-10 md:self-start">
          <p className="eyebrow text-primary">O que é</p>
          <h2 className="page-title mt-3 md:text-5xl">Gestão e divulgação de agendas, num só lugar.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Administradores cadastram perfis e eventos; o público consulta agendas, contatos e redes sociais dos artistas publicados.
          </p>
          <Link to="/login" className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:scale-[1.02]">
            Entrar na gestão <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ol className="divide-y divide-border border-y border-border">
          {points.map((p, i) => (
            <li key={p.title} className="grid grid-cols-[3rem_1fr] gap-4 py-7">
              <span className="tabular font-display text-sm font-semibold text-muted-foreground">0{i + 1}</span>
              <div>
                <h3 className="section-title">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="recursos" className="border-y border-border bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <p className="eyebrow text-primary">Recursos</p>
        <h2 className="page-title mt-3 max-w-2xl md:text-5xl">Feito para quem sobe no palco.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Feature className="md:col-span-4" icon={Calendar} color="var(--brand-violet)" title="Agenda de shows" body="Cadastre as apresentações de cada artista, defina o que é público e publique os eventos com data, local, mapa e link de ingresso." big />
          <Feature className="md:col-span-2" icon={Link2} color="var(--brand-turquoise)" title="Um link, tudo do artista" body="Bio, redes, contratação e agenda numa URL fácil de lembrar." />
          <Feature className="md:col-span-3" icon={QrCode} color="var(--brand-magenta)" title="Compartilhamento com QR Code" body="WhatsApp, Instagram, Facebook, Telegram e QR Code automático para flyers." />
          <Feature className="md:col-span-3" icon={ShieldCheck} color="var(--brand-orange)" title="Gestão protegida" body="Cada administrador gerencia os seus artistas; o Administrador Master tem visão geral." />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon: Icon, color, title, body, className, big }: { icon: typeof Calendar; color: string; title: string; body: string; className?: string; big?: boolean }) {
  return (
    <div className={`panel group relative overflow-hidden p-6 md:p-8 ${className ?? ""}`}>
      <div aria-hidden className="absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-35" style={{ background: color }} />
      <div className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: color }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className={`mt-6 font-display font-semibold tracking-tight ${big ? "text-2xl md:text-3xl" : "text-xl"}`}>{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Cadastre o artista", body: "Nome artístico, biografia, fotos e contatos para contratação." },
    { n: "02", title: "Organize os shows", body: "Adicione as apresentações na agenda e publique as que quiser divulgar." },
    { n: "03", title: "Compartilhe a agenda", body: "Envie o link público ou o QR Code em agenda.efcsys.com/artistas/seu-nome." },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <p className="eyebrow text-primary">Como funciona</p>
      <h2 className="page-title mt-3 max-w-2xl md:text-5xl">Três passos até o primeiro show na página.</h2>
      <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="bg-card p-7 md:p-9">
            <span className="tabular font-display text-5xl font-semibold text-brand-gradient">{s.n}</span>
            <h3 className="section-title mt-6">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CTA() {
  return (
    <section id="publico" className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
      <div className="bg-brand-gradient relative isolate overflow-hidden rounded-[2rem] px-7 py-12 text-white md:px-14 md:py-16">
        <div aria-hidden className="bg-grain absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -right-24 -bottom-24 -z-10 h-80 w-80 rounded-full opacity-50 blur-3xl" style={{ background: "var(--brand-orange)" }} />
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">Sua próxima temporada começa em um link.</h2>
          <p className="mt-4 text-white/80">Cantores, bandas, DJs, humoristas, instrumentistas, grupos e produtores: quem faz show merece uma página oficial.</p>
          <Link to="/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-ink transition-transform hover:scale-[1.02]">
            Acessar gestão <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="pb-safe mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <Link to="/termos" className="hover:text-foreground">Termos</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          <a href="mailto:caixaspoint@gmail.com" className="hover:text-foreground">Contato</a>
          <ThemeToggle />
          <EfcsysSignature />
        </div>
      </div>
    </footer>
  );
}
