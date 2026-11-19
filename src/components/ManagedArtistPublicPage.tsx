import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Copy, ExternalLink, MapPin, Play, Share2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { EfcsysSignature, Ingresso, accentFor, logoUrl } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { shareTargets, socialLinks } from "@/lib/share";

export type PublicManagedArtist = {
  id: string;
  artist_name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  show_booking_contact: boolean;
  instagram: string | null;
  spotify: string | null;
  youtube: string | null;
  tiktok: string | null;
  sua_musica: string | null;
  twitter: string | null;
  soundcloud: string | null;
  avatar_url: string | null;
  cover_url: string | null;
};

export type PublicManagedEvent = {
  id: string;
  title: string;
  slug: string;
  banner_url: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  maps_url: string | null;
  ticket_url: string | null;
  description: string | null;
  status: string;
};

export type PublicManagedMedia = {
  id: string;
  kind: string;
  display_url: string | null;
  caption: string | null;
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const selectCls = "h-11 rounded-md border border-line bg-sheet px-3 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20";

export function ManagedArtistPublicPage({ artist, events, media }: { artist: PublicManagedArtist | null; events: PublicManagedEvent[]; media: PublicManagedMedia[] }) {
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const years = useMemo(() => Array.from(new Set(events.map((event) => new Date(event.starts_at).getFullYear()).filter(Number.isFinite))).sort(), [events]);
  const filtered = useMemo(() => events.filter((event) => {
    const date = new Date(event.starts_at);
    return !Number.isNaN(date.getTime()) && (month === "all" || date.getMonth() === Number(month)) && (year === "all" || date.getFullYear() === Number(year));
  }), [events, month, year]);

  if (!artist) return <NotFound />;
  const location = [artist.city, artist.state].filter(Boolean).join(" · ");
  const bookingHref = artist.whatsapp ? `https://wa.me/${normalizePhone(artist.whatsapp)}` : artist.contact_email ? `mailto:${artist.contact_email}` : artist.phone ? `tel:${artist.phone.replace(/[^\d+]/g, "")}` : null;
  const socials = socialLinks({ ...artist, whatsapp: null });
  if (artist.sua_musica) socials.push({ label: "Sua Música", href: normalizeUrl(artist.sua_musica) });

  const shareAgenda = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Agenda de ${artist.artist_name}`, text: `Confira a agenda de ${artist.artist_name}`, url }); return; }
      catch { return; }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link da agenda copiado.");
  };

  const accent = accentFor(artist.id);
  const photo = artist.cover_url || artist.avatar_url;
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className={`pi-stage grid bg-stage text-white ${photo ? "md:grid-cols-[1fr_40%]" : ""}`}>
        <div className={`pt-safe flex flex-col gap-4 px-5 pb-10 sm:px-10 ${photo ? "" : "mx-auto w-full max-w-[880px] min-h-[340px] sm:!px-6"}`}>
          <div className="flex items-center justify-between py-5">
            <Link to="/" aria-label="Point do Ingresso"><img src={logoUrl} alt="" className="h-9 w-9 rounded-full bg-white" /></Link>
            <button type="button" onClick={shareAgenda} className="pi-ghost"><Share2 className="h-[18px] w-[18px]" /> Compartilhar</button>
          </div>
          <span className="pi-strip mt-auto" />
          {(artist.genre || location) && <p className="text-sm text-[#c9c1dd]">{[artist.genre, location].filter(Boolean).join(" · ")}</p>}
          <h1 className="poster-title text-[64px] break-words sm:text-[88px] lg:text-[112px]">{artist.artist_name}</h1>
          <div className="flex flex-wrap gap-2">
            {bookingHref && artist.show_booking_contact && <a href={bookingHref} target={bookingHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-medium text-[#1e0b3f] hover:bg-[#f3f0fa]">Contratar para show</a>}
            {socials.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="pi-ghost h-11">{social.label}</a>)}
          </div>
        </div>
        {photo && <div className="relative order-first h-56 overflow-hidden bg-stage md:order-none md:h-auto md:min-h-[420px]">
          <img src={photo} alt={`Foto de ${artist.artist_name}`} className="pi-duotone absolute inset-0 h-full w-full object-cover" />
        </div>}
      </header>

      <main className="mx-auto grid max-w-[880px] gap-12 px-4 py-10 sm:px-6">
        {artist.bio && <p className="max-w-[65ch] text-lg leading-relaxed whitespace-pre-line">{artist.bio}</p>}

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="page-title">Próximos shows</h2>
            <div className="flex flex-wrap gap-2">
              <label className="grid gap-2 text-sm font-medium">Mês<select value={month} onChange={(event) => setMonth(event.target.value)} className={selectCls}><option value="all">Todos</option>{MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
              {years.length > 1 && <label className="grid gap-2 text-sm font-medium">Ano<select value={year} onChange={(event) => setYear(event.target.value)} className={selectCls}><option value="all">Todos</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="grid justify-items-center gap-2 rounded-[10px] border border-dashed border-line bg-sheet px-6 py-10 text-center">
              <CalendarDays className="h-6 w-6 text-ink-soft" />
              <p className="section-title">Nenhum show neste período</p>
              <p className="text-sm text-ink-soft">Volte em breve ou compartilhe a página para acompanhar a agenda.</p>
              {(month !== "all" || year !== "all") && <button type="button" onClick={() => { setMonth("all"); setYear("all"); }} className="mt-2 h-10 rounded-md border border-line px-4 text-sm font-medium hover:border-ink-soft">Ver todos os meses</button>}
            </div>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((event) => (
                <li key={event.id}>
                  <Link to="/artistas/$slug/eventos/$eventSlug" params={{ slug: artist.slug, eventSlug: event.slug }} className="block rounded-2xl hover:[&>.pi-ticket]:border-ink-soft">
                    <Ingresso start={event.starts_at} end={event.ends_at} title={event.title} place={[event.venue, [event.city, event.state].filter(Boolean).join(" – ")].filter(Boolean).join(", ") || "Local a confirmar"} accent={accent} status={event.status === "cancelled" ? "cancelled" : undefined} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {media.length > 0 && <section><h2 className="page-title mb-4">Fotos e vídeos</h2><div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => item.display_url && (item.kind === "video" ? <a key={item.id} href={item.display_url} target="_blank" rel="noreferrer" className="flex aspect-square flex-col items-center justify-center gap-3 rounded-[10px] border border-line bg-sheet text-sm font-medium hover:border-ink-soft"><span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper"><Play className="h-5 w-5" /></span>Assistir vídeo</a> : <figure key={item.id}><img src={item.display_url} alt={item.caption || `Foto de ${artist.artist_name}`} loading="lazy" className="aspect-square w-full rounded-[10px] object-cover" />{item.caption && <figcaption className="mt-1.5 text-xs text-ink-soft">{item.caption}</figcaption>}</figure>))}</div></section>}

        <PublicFooter />
      </main>
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="pb-safe flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-ink-soft">
      <span>Agenda publicada pelo Point do Ingresso</span>
      <EfcsysSignature />
    </footer>
  );
}

export function ManagedEventPublicPage({ artist, event }: { artist: PublicManagedArtist | null; event: PublicManagedEvent | null }) {
  if (!artist || !event) return <NotFound />;
  const url = typeof window === "undefined" ? `https://agenda.efcsys.com/artistas/${artist.slug}/eventos/${event.slug}` : window.location.href;
  const copy = async () => { await navigator.clipboard.writeText(window.location.href); toast.success("Link do evento copiado."); };
  const when = formatWhen(event.starts_at, event.ends_at);
  return <div className="min-h-dvh bg-paper text-ink">
    <header className="pi-stage relative isolate overflow-hidden bg-stage text-white">
      {(event.banner_url || artist.cover_url) && <img src={event.banner_url || artist.cover_url || ""} alt="" className="pi-duotone absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />}
      <div className="pt-safe mx-auto flex min-h-[360px] max-w-[880px] flex-col gap-4 px-5 pb-10 sm:px-6">
        <div className="flex items-center justify-between py-5">
          <Link to="/" aria-label="Point do Ingresso"><img src={logoUrl} alt="" className="h-9 w-9 rounded-full bg-white" /></Link>
          <Link to="/artistas/$slug" params={{ slug: artist.slug }} className="pi-ghost">{artist.avatar_url && <img src={artist.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />}{artist.artist_name}</Link>
        </div>
        <span className="pi-strip mt-auto" />
        <p className="text-sm text-[#c9c1dd] first-letter:uppercase">{when}</p>
        <h1 className="poster-title text-[56px] break-words sm:text-[96px]">{event.title}</h1>
        {event.status === "cancelled" && <span className="pi-status w-fit text-[#ff86b0]">Show cancelado</span>}
      </div>
    </header>
    <main className="mx-auto grid max-w-[880px] gap-10 px-4 py-10 sm:px-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <dl className="panel divide-y divide-line">
            <div className="flex gap-3 px-5 py-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet" /><div><dt className="text-sm text-ink-soft">Onde</dt><dd>{[event.venue, event.address, [event.city, event.state].filter(Boolean).join(" – ")].filter(Boolean).join(" · ") || "Local a confirmar"}</dd></div></div>
            <div className="flex gap-3 px-5 py-4"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-violet" /><div><dt className="text-sm text-ink-soft">Quando</dt><dd className="first-letter:uppercase">{when}</dd></div></div>
          </dl>
          {event.description && <p className="max-w-[65ch] text-lg leading-relaxed whitespace-pre-line">{event.description}</p>}
        </div>
        <aside className="grid content-start gap-2 md:sticky md:top-6">
          {event.ticket_url && event.status !== "cancelled" && <a href={event.ticket_url} target="_blank" rel="noreferrer" className="inline-flex h-13 items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground hover:bg-violet"><Ticket className="h-5 w-5" /> Comprar ingresso</a>}
          {event.maps_url && <a href={event.maps_url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-sheet text-sm font-medium hover:border-ink-soft"><MapPin className="h-[18px] w-[18px]" /> Abrir no mapa</a>}
          <button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-sheet text-sm font-medium hover:border-ink-soft"><Copy className="h-[18px] w-[18px]" /> Copiar link do show</button>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">{shareTargets(url, `Confira ${event.title}, de ${artist.artist_name}:`).map((target) => <a key={target.label} href={target.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet hover:underline">{target.label}<ExternalLink className="h-3.5 w-3.5" /></a>)}</div>
        </aside>
      </div>
      <PublicFooter />
    </main>
  </div>;
}

function NotFound() { return <main className="grid min-h-dvh place-items-center bg-paper px-5 text-center"><div><img src={logoUrl} alt="" className="mx-auto mb-6 h-14 w-14 rounded-full border border-line bg-white" /><h1 className="page-title">Página não encontrada</h1><p className="mt-2 text-muted-foreground">Esta página não está publicada ou não existe.</p></div></main>; }
function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length <= 11 ? `55${digits}` : digits; }
function normalizeUrl(value: string) { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }
const TZ = "America/Sao_Paulo";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const hour = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d).replace(":00", "h").replace(":", "h");
/** "sábado, 28 de novembro de 2026, das 21h às 01h (domingo, 29)" */
function formatWhen(startIso: string, endIso?: string | null) {
  const start = new Date(startIso);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "full" }).format(start);
  const end = endIso ? new Date(endIso) : null;
  if (!end || Number.isNaN(end.getTime()) || end <= start) return `${date}, às ${hour(start)}`;
  const nextDay = dayKey(end) !== dayKey(start)
    ? ` (${new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric" }).format(end).replace("-feira", "")})`
    : "";
  return `${date}, das ${hour(start)} às ${hour(end)}${nextDay}`;
}