import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logoUrl from "@/assets/point-do-ingresso-logo.png";
import { cn } from "@/lib/utils";

export { logoUrl };

/* ---------- Marca ---------- */

export function BrandMark({ to = "/", compact = false, className, tone = "default" }: { to?: string; compact?: boolean; className?: string; tone?: "default" | "inverse" }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)} aria-label="Agenda Point do Ingresso, início">
      <img src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full border border-line bg-white" />
      {!compact && (
        <span className="leading-tight">
          <span className={cn("block text-[15px] font-semibold", tone === "inverse" ? "text-white" : "text-ink")}>Agenda Point</span>
          <span className={cn("block text-xs", tone === "inverse" ? "text-white/70" : "text-ink-soft")}>Point do Ingresso</span>
        </span>
      )}
    </Link>
  );
}

/** Assinatura EFCSYS — "by: efcsys". */
export function EfcsysSignature({ className }: { className?: string }) {
  return (
    <a href="https://efcsys.com" target="_blank" rel="noreferrer" className={cn("text-xs text-ink-soft hover:text-ink", className)} title="Desenvolvido por EFCsys • Todos os direitos reservados.">
      by: <b className="font-semibold">efcsys</b>
    </a>
  );
}

/* ---------- Estrutura de página ---------- */

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6">
      {back && <div className="mb-2 text-sm text-ink-soft">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Vazio: diz o que fica aqui, por que preencher e oferece a ação. */
export function EmptyState({ title, children, actions, icon }: { title: string; children?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[10px] border border-dashed border-line bg-sheet px-6 py-10 text-center">
      {icon && <div className="mb-1 text-ink-soft">{icon}</div>}
      <p className="section-title">{title}</p>
      {children && <div className="max-w-md text-sm text-ink-soft">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

/** Linha de resumo (rótulo à esquerda, valor à direita) para painéis. Sem números simulados. */
export function SummaryRows({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <section className="panel">
      <h2 className="section-title px-5 pt-4 pb-1">{title}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 first:border-t-0">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="tabular text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Mantido por compatibilidade: indicador simples dentro de um painel. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="tabular mt-1 font-poster text-3xl font-semibold">{value}</p>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

/* ---------- Status ---------- */

export type StatusKind = "published" | "draft" | "hidden" | "cancelled";
const STATUS_LABEL: Record<StatusKind, string> = { published: "Publicado", draft: "Rascunho", hidden: "Oculto", cancelled: "Cancelado" };

export function Status({ kind, label }: { kind: StatusKind; label?: string }) {
  return <span className={`pi-status pi-status--${kind}`}>{label ?? STATUS_LABEL[kind]}</span>;
}

/* ---------- Ingresso ---------- */

export type Accent = "pink" | "teal" | "orange" | "violet";
const ACCENTS: Accent[] = ["pink", "teal", "orange", "violet"];

/** Cor fixa por artista (rodízio estável a partir do id). */
export function accentFor(id: string | null | undefined): Accent {
  if (!id) return "violet";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

const TZ = "America/Sao_Paulo";
function dateParts(iso: string) {
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = allDay ? new Date(`${iso}T12:00:00-03:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "--", month: "", weekday: "", time: "" };
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...o }).format(d);
  return {
    day: fmt({ day: "2-digit" }),
    month: fmt({ month: "short" }).replace(".", ""),
    weekday: fmt({ weekday: "long" }).replace("-feira", ""),
    time: allDay ? "" : fmt({ hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h"),
  };
}

export function Ingresso({
  start,
  title,
  place,
  artist,
  status,
  accent = "violet",
  actions,
  onSheet,
  className,
}: {
  start: string;
  title: string;
  place?: string | null;
  artist?: string | null;
  status?: StatusKind;
  accent?: Accent;
  actions?: ReactNode;
  onSheet?: boolean;
  className?: string;
}) {
  const p = dateParts(start);
  const line = [p.time, place].filter(Boolean).join(" · ");
  return (
    <div className={cn("pi-ticket", className)} data-accent={accent} style={onSheet ? ({ ["--notch-bg" as string]: "var(--sheet)" } as React.CSSProperties) : undefined}>
      <div className="pi-ticket__stub" aria-hidden>
        <div className="pi-ticket__day">{p.day}</div>
        <div className="pi-ticket__month">{p.month}</div>
        <div className="pi-ticket__weekday">{p.weekday}</div>
      </div>
      <div className="pi-ticket__body">
        <span className="sr-only">{`${p.day} de ${p.month}, ${p.weekday}`}</span>
        <div className="flex items-start justify-between gap-3">
          <h3 className="pi-ticket__title">{title}</h3>
          {actions && <div className="-mt-1 -mr-2 flex shrink-0 items-center">{actions}</div>}
        </div>
        {line && <p className="text-sm text-ink-soft">{line}</p>}
        {(artist || status) && (
          <div className="flex flex-wrap items-center gap-4">
            {artist && <span className="text-sm font-medium">{artist}</span>}
            {status && <Status kind={status} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Botão só com ícone: quadrado, rótulo acessível e dica visível no hover/foco. */
export function IconButton({ label, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} className={cn("group relative grid h-10 w-10 place-items-center rounded-md text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:opacity-50", className)} {...props}>
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1.5 text-xs font-medium whitespace-nowrap text-paper group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

/* ---------- Tema claro/escuro ---------- */

export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#110a22" : "#f4f3f7");
  };
  return (
    <button type="button" onClick={toggle} className={cn("inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm text-ink-soft hover:bg-paper hover:text-ink", className)} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
