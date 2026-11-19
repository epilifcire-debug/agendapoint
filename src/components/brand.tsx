import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logoUrl from "@/assets/point-do-ingresso-logo.png";
import { cn } from "@/lib/utils";

export { logoUrl };

/** Logo circular + nome do produto. */
export function BrandMark({ to = "/", compact = false, className, tone = "default" }: { to?: string; compact?: boolean; className?: string; tone?: "default" | "inverse" }) {
  return (
    <Link to={to} className={cn("group flex items-center gap-3", className)} aria-label="Agenda Point do Ingresso — início">
      <img src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-black/5 transition-transform group-hover:scale-105" />
      {!compact && (
        <span className="leading-none">
          <span className={cn("block font-display text-[0.95rem] font-semibold tracking-tight", tone === "inverse" ? "text-white" : "text-foreground")}>Point do Ingresso</span>
          <span className={cn("mt-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.16em]", tone === "inverse" ? "text-white/65" : "text-muted-foreground")}>Agenda de Artistas</span>
        </span>
      )}
    </Link>
  );
}

/** Assinatura EFCSYS — preferência gráfica "by: efcsys". */
export function EfcsysSignature({ className }: { className?: string }) {
  return (
    <a
      href="https://efcsys.com"
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-baseline gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground", className)}
      aria-label="Desenvolvido por EFCsys • Todos os direitos reservados."
      title="Desenvolvido por EFCsys • Todos os direitos reservados."
    >
      <span className="opacity-70">by:</span>
      <span className="font-display text-[0.8125rem] font-semibold tracking-tight">efcsys</span>
    </a>
  );
}

/** Cabeçalho padrão das telas internas. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex animate-rise flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-[0.9375rem]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Indicador numérico. Sem dados reais, mostra o valor recebido (zero/—), nunca simulado. */
export function StatCard({ label, value, hint, accent = "var(--brand-violet)" }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title?: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      {title && <p className="font-display text-base font-semibold">{title}</p>}
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/* ---------- Tema claro/escuro ---------- */

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* armazenamento indisponível */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#140c26" : "#faf8fc");
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
