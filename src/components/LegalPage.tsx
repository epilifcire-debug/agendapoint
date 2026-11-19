import { Link } from "@tanstack/react-router";
import { BrandMark, EfcsysSignature } from "@/components/brand";

export const LEGAL_UPDATED_AT = "7 de outubro de 2026";
export const CONTACT_EMAIL = "caixaspoint@gmail.com";

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="pt-safe sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <BrandMark />
          <Link to="/" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Início</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="max-w-3xl">
          <p className="eyebrow text-primary">Documento público</p>
          <h1 className="page-title mt-2 md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Última atualização: {LEGAL_UPDATED_AT}</p>
          <p className="mt-6 text-base leading-7 text-foreground/90">{intro}</p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label={`Sumário de ${title}`} className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-sm font-bold">Nesta página</h2>
            <ol className="mt-3 space-y-2 border-l border-border pl-4 text-sm text-muted-foreground">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="hover:text-primary">{index + 1}. {section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 border-b border-border pb-10 last:border-0">
                <h2 className="section-title md:text-2xl">{index + 1}. {section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-foreground/90">{section.content}</div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground md:flex-row">
          <EfcsysSignature />
          <div className="flex items-center gap-5">
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}