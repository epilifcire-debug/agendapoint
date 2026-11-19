import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Copy, ExternalLink, MapPin, Play, Share2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { BrandMark, EfcsysSignature, logoUrl } from "@/components/brand";
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
const selectCls = "h-10 rounded-full border border-border bg-card px-4 text-sm font-medium outline-none focus:border-ring focus:ring-4 focus:ring-ring/15";

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

  return (
    <div className="public-agenda min-h-dvh bg-background text-foreground">
      <header className="relative isolate overflow-hidden">
        <img src={artist.cover_url || artist.avatar_url || logoUrl} alt="" className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/10 via-background/70 to-background" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_100%,color-mix(in_oklab,var(--brand-purple)_40%,transparent),transparent)]" />
        <div className="pt-safe mx-auto max-w-5xl px-5 sm:px-6">
          <div className="flex items-center justify-between py-5">
            <BrandMark tone="inverse" compact />
            <Button onClick={shareAgenda} size="sm" variant="secondary" className="rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"><Share2 /> Compartilhar</Button>
          </div>
          <div className="flex min-h-[340px] flex-col justify-end pb-10 sm:min-h-[400px]">
            <img src={artist.avatar_url || logoUrl} alt={`Foto de ${artist.artist_name}`} className="h-28 w-28 animate-rise rounded-full border-4 border-background object-cover shadow-brand sm:h-32 sm:w-32" />
            {(artist.genre || location) && <p className="eyebrow mt-6 text-white/70">{[artist.genre, location].filter(Boolean).join(" · ")}</p>}
            <h1 className="display-title mt-2 animate-rise text-white">{artist.artist_name}</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {bookingHref && artist.show_booking_contact && <Button asChild className="rounded-full px-5"><a href={bookingHref} target={bookingHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Contratar para show <ArrowUpRight /></a></Button>}
              {socials.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/15">{social.label}<ExternalLink className="h-3.5 w-3.5 opacity-60" /></a>)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-5 py-12 sm:px-6">
        {artist.bio && <section className="grid gap-4 md:grid-cols-[200px_1fr]"><p className="eyebrow pt-1.5">Sobre</p><p className="max-w-3xl whitespace-pre-line text-[1.0625rem] leading-8 text-foreground/85">{artist.bio}</p></section>}

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-primary">Agenda</p>
              <h2 className="page-title mt-2">Próximos shows</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Mês" value={month} onChange={(event) => setMonth(event.target.value)} className={selectCls}><option value="all">Todos os meses</option>{MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select>
              <select aria-label="Ano" value={year} onChange={(event) => setYear(event.target.value)} className={selectCls}><option value="all">Todos os anos</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="mt-8 grid place-items-center rounded-3xl border border-dashed border-border py-14 text-center"><CalendarDays className="h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nenhum show publicado neste período.</p></div>
          ) : (
            <ul className="mt-8 grid gap-3">
              {filtered.map((event) => {
                const date = new Date(event.starts_at);
                return (
                  <li key={event.id}>
                    <Link to="/artistas/$slug/eventos/$eventSlug" params={{ slug: artist.slug, eventSlug: event.slug }} className="group panel flex items-center gap-4 p-3 pr-5 transition-colors hover:border-primary/40 sm:gap-6 sm:p-4">
                      <div className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white sm:h-20 sm:w-20">
                        <div className="text-center leading-none">
                          <div className="tabular font-display text-2xl font-semibold sm:text-3xl">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date)}</div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest">{MONTHS[date.getMonth()].slice(0, 3)}</div>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">{event.title}</h3>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{[event.venue, event.city, event.state].filter(Boolean).join(" · ") || "Local a confirmar"}</span></p>
                        <p className="tabular mt-0.5 text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(date)}</p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {media.length > 0 && <section><p className="eyebrow text-primary">Galeria</p><h2 className="page-title mt-2">Fotos e vídeos</h2><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">{media.map((item) => item.display_url && (item.kind === "video" ? <a key={item.id} href={item.display_url} target="_blank" rel="noreferrer" className="panel flex aspect-square flex-col items-center justify-center gap-3 text-sm font-semibold transition-colors hover:border-primary/40"><span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="h-5 w-5" /></span>Assistir vídeo</a> : <figure key={item.id} className="overflow-hidden rounded-2xl"><img src={item.display_url} alt={item.caption || `Galeria de ${artist.artist_name}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105" />{item.caption && <figcaption className="mt-1.5 text-xs text-muted-foreground">{item.caption}</figcaption>}</figure>))}</div></section>}

        <PublicFooter />
      </main>
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="pb-safe flex flex-col items-center gap-4 border-t border-border pt-10 text-center sm:flex-row sm:justify-between sm:text-left">
      <BrandMark tone="inverse" />
      <EfcsysSignature />
    </footer>
  );
}

export function ManagedEventPublicPage({ artist, event }: { artist: PublicManagedArtist | null; event: PublicManagedEvent | null }) {
  if (!artist || !event) return <NotFound />;
  const url = typeof window === "undefined" ? `https://agenda.efcsys.com/artistas/${artist.slug}/eventos/${event.slug}` : window.location.href;
  const copy = async () => { await navigator.clipboard.writeText(window.location.href); toast.success("Link do evento copiado."); };
  return <div className="public-agenda min-h-dvh bg-background text-foreground">
    <header className="relative isolate overflow-hidden">
      <img src={event.banner_url || artist.cover_url || artist.avatar_url || logoUrl} alt={`Arte de ${event.title}`} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/20 via-background/70 to-background" />
      <div className="pt-safe mx-auto max-w-4xl px-5 sm:px-6">
        <div className="flex items-center justify-between py-5"><BrandMark tone="inverse" compact /><Link to="/artistas/$slug" params={{ slug: artist.slug }} className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"><img src={artist.avatar_url || logoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />{artist.artist_name}</Link></div>
        <div className="flex min-h-[320px] flex-col justify-end pb-10">
          <p className="eyebrow text-white/70">{formatDateTime(event.starts_at)}</p>
          <h1 className="display-title mt-3 max-w-3xl text-white">{event.title}</h1>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <article className="space-y-6">
          <div className="panel divide-y divide-border">
            <div className="flex items-start gap-3 p-5"><CalendarDays className="mt-0.5 h-5 w-5 text-primary" /><div><p className="eyebrow">Quando</p><p className="mt-1 font-semibold first-letter:uppercase">{formatDateTime(event.starts_at)}</p></div></div>
            <div className="flex items-start gap-3 p-5"><MapPin className="mt-0.5 h-5 w-5 text-primary" /><div><p className="eyebrow">Onde</p><p className="mt-1 font-semibold">{[event.venue, event.address, event.city, event.state].filter(Boolean).join(" · ") || "Local a confirmar"}</p></div></div>
          </div>
          {event.description && <p className="whitespace-pre-line text-[1.0625rem] leading-8 text-foreground/85">{event.description}</p>}
        </article>
        <aside className="space-y-3 md:sticky md:top-6 md:self-start">
          {event.ticket_url && <Button asChild size="lg" className="w-full rounded-full"><a href={event.ticket_url} target="_blank" rel="noreferrer"><Ticket /> Comprar ingresso</a></Button>}
          {event.maps_url && <Button asChild variant="outline" className="h-11 w-full rounded-full"><a href={event.maps_url} target="_blank" rel="noreferrer"><MapPin /> Ver no mapa</a></Button>}
          <Button onClick={copy} variant="outline" className="h-11 w-full rounded-full"><Copy /> Copiar link</Button>
          <div className="panel p-3"><p className="eyebrow px-2 pb-2">Compartilhar</p><div className="grid grid-cols-2 gap-1">{shareTargets(url, `Confira ${event.title}, de ${artist.artist_name}:`).map((target) => <Button key={target.label} asChild size="sm" variant="ghost"><a href={target.href} target="_blank" rel="noreferrer">{target.label}</a></Button>)}</div></div>
        </aside>
      </div>
      <div className="mt-16"><PublicFooter /></div>
    </main>
  </div>;
}

function NotFound() { return <main className="public-agenda grid min-h-dvh place-items-center bg-background px-5 text-center"><div><img src={logoUrl} alt="" className="mx-auto mb-6 h-14 w-14 rounded-full bg-white" /><h1 className="page-title">Conteúdo não encontrado</h1><p className="mt-2 text-muted-foreground">Esta página não está publicada ou não existe.</p></div></main>; }
function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length <= 11 ? `55${digits}` : digits; }
function normalizeUrl(value: string) { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value)); }