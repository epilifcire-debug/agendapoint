import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Copy, ExternalLink, ImagePlus, Pencil, Plus, Search, Share2, Trash2 } from "lucide-react";
import { EmptyState, IconButton, Ingresso, PageHeader, Status, accentFor } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { listManagedArtists, createManagedArtist, updateManagedArtist, setManagedArtistStatus, listManagedEvents, saveManagedEvent, deleteManagedEvent, listManagedMedia, addManagedMediaLink, deleteManagedMedia, prepareManagedUpload, confirmManagedUpload, type ManagedArtist, type ManagedEvent } from "@/lib/managedArtists.functions";

export const Route = createFileRoute("/_authenticated/artistas")({
  component: ArtistsPage,
  head: () => ({ meta: [
    { title: "Artistas — Agenda Point do Ingresso" },
    { name: "description", content: "Gerencie os artistas, eventos e páginas públicas da Agenda Point do Ingresso." },
    { property: "og:title", content: "Artistas — Agenda Point do Ingresso" },
    { property: "og:description", content: "Gerencie os artistas, eventos e páginas públicas da Agenda Point do Ingresso." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

const input = "w-full min-h-11 rounded-md border border-line bg-sheet px-3 py-2.5 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20";
const AV_BG = { pink: "bg-pink", teal: "bg-teal", orange: "bg-orange", violet: "bg-violet" } as const;
const fields = ["artist_name", "slug", "bio", "genre", "city", "state", "phone", "whatsapp", "contact_email", "instagram", "spotify", "youtube", "tiktok", "sua_musica", "twitter", "soundcloud"] as const;
type ArtistField = typeof fields[number];
type ArtistForm = Record<ArtistField, string> & { show_booking_contact: boolean };
const labels: Record<ArtistField, string> = { artist_name: "Nome artístico", slug: "Slug público", bio: "Biografia", genre: "Gênero musical", city: "Cidade", state: "Estado (UF)", phone: "Telefone", whatsapp: "WhatsApp", contact_email: "E-mail para contratação", instagram: "Instagram", spotify: "Spotify", youtube: "YouTube", tiktok: "TikTok", sua_musica: "Sua Música", twitter: "Twitter / X", soundcloud: "SoundCloud" };
const emptyArtist = (): ArtistForm => ({ ...Object.fromEntries(fields.map(key => [key, ""])) as Record<ArtistField, string>, show_booking_contact: true });
const artistForm = (artist: ManagedArtist): ArtistForm => ({ ...Object.fromEntries(fields.map(key => [key, artist[key] ?? ""])) as Record<ArtistField, string>, show_booking_contact: artist.show_booking_contact });
const eventFields = ["title", "slug", "starts_at", "ends_at", "venue", "city", "state", "address", "maps_url", "ticket_url", "description"] as const;
type EventField = typeof eventFields[number];
type EventForm = Record<EventField, string> & { status: "scheduled" | "completed" | "cancelled"; is_published: boolean };
const eventLabels: Record<EventField, string> = { title: "Nome do evento", slug: "Slug público", starts_at: "Data e horário", ends_at: "Término (opcional)", venue: "Local", city: "Cidade", state: "Estado (UF)", address: "Endereço", maps_url: "Link do Google Maps", ticket_url: "Link de ingressos", description: "Descrição" };
const emptyEvent = (): EventForm => ({ ...Object.fromEntries(eventFields.map(key => [key, ""])) as Record<EventField, string>, status: "scheduled", is_published: false });
const eventForm = (event: ManagedEvent): EventForm => ({ ...Object.fromEntries(eventFields.map(key => [key, key === "starts_at" || key === "ends_at" ? event[key] ? localDateTime(event[key]) : "" : event[key] ?? ""])) as Record<EventField, string>, status: event.status, is_published: event.is_published });
const localDateTime = (value: string) => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const statuses: Record<ManagedArtist["status"], string> = { draft: "Rascunho", published: "Publicado", hidden: "Oculto", archived: "Arquivado" };

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-medium"><span>{label}</span>{children}</label>; }

function ArtistsPage() {
  const qc = useQueryClient();
  const adminFn = useServerFn(amIAdmin);
  const listFn = useServerFn(listManagedArtists);
  const createFn = useServerFn(createManagedArtist);
  const updateFn = useServerFn(updateManagedArtist);
  const statusFn = useServerFn(setManagedArtistStatus);
  const eventsFn = useServerFn(listManagedEvents);
  const saveEventFn = useServerFn(saveManagedEvent);
  const removeEventFn = useServerFn(deleteManagedEvent);
  const mediaFn = useServerFn(listManagedMedia);
  const addMediaFn = useServerFn(addManagedMediaLink);
  const removeMediaFn = useServerFn(deleteManagedMedia);
  const prepareFn = useServerFn(prepareManagedUpload);
  const confirmFn = useServerFn(confirmManagedUpload);
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  const artists = useQuery({ queryKey: ["managed-artists"], queryFn: () => listFn(), enabled: admin.data?.isAdmin === true });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"profile" | "events" | "gallery">("profile");
  const [form, setForm] = useState<ArtistForm>(emptyArtist);
  const [event, setEvent] = useState<EventForm>(emptyEvent);
  const [eventId, setEventId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("video");
  const [busy, setBusy] = useState(false);
  const selected = artists.data?.artists.find(a => a.id === selectedId);
  const events = useQuery({ queryKey: ["managed-events", selectedId], queryFn: () => eventsFn({ data: { artistId: selectedId ?? "" } }), enabled: !!selectedId });
  const media = useQuery({ queryKey: ["managed-media", selectedId], queryFn: () => mediaFn({ data: { artistId: selectedId ?? "" } }), enabled: !!selectedId });
  const refresh = () => qc.invalidateQueries({ queryKey: ["managed-artists"] });
  const refreshEvents = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["managed-events", selectedId] }), qc.invalidateQueries({ queryKey: ["admin-agenda"] })]); };
  const refreshMedia = () => qc.invalidateQueries({ queryKey: ["managed-media", selectedId] });
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação."); } finally { setBusy(false); } };
  const link = (artist: ManagedArtist) => `${window.location.origin}/artistas/${artist.slug}`;
  const copy = async (url: string) => { await navigator.clipboard.writeText(url); toast.success("Link copiado."); };
  const share = async (artist: ManagedArtist) => { if (navigator.share) { try { await navigator.share({ title: `Agenda de ${artist.artist_name}`, url: link(artist) }); } catch { /* Cancelled */ } } else await copy(link(artist)); };
  const upload = async (file: File, purpose: "avatar" | "cover" | "banner" | "gallery", eventId?: string) => {
    if (!selectedId) return;
    const ext = file.name.split(".").at(-1)?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext) || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.");
    const signed = await prepareFn({ data: { artistId: selectedId, purpose, extension: ext as "jpg" | "jpeg" | "png" | "webp" } });
    const { error } = await supabase.storage.from("avatars").uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
    if (error) throw error;
    await confirmFn({ data: { artistId: selectedId, purpose, path: signed.path, ...(eventId ? { eventId } : {}) } });
    purpose === "gallery" ? await refreshMedia() : purpose === "banner" ? await refreshEvents() : await refresh();
    toast.success("Imagem salva.");
  };
  const [statusFilter, setStatusFilter] = useState<"all" | ManagedArtist["status"]>("all");
  const openArtist = (a: ManagedArtist, t: "profile" | "events" | "gallery" = "profile") => { setSelectedId(a.id); setCreating(false); setTab(t); setForm(artistForm(a)); setEvent(emptyEvent()); setEventId(null); window.scrollTo({ top: 0 }); };
  const closeEditor = () => { setCreating(false); setSelectedId(null); };
  const saveArtist = () => run(async () => { const data = { ...form, ...Object.fromEntries(fields.filter(key => !["artist_name", "slug"].includes(key)).map(key => [key, form[key].trim() || null])), artist_name: form.artist_name.trim(), slug: form.slug.trim() }; if (selectedId) await updateFn({ data: { id: selectedId, ...data } }); else { const created = await createFn({ data }); setSelectedId(created.id); setCreating(false); } await refresh(); toast.success("Artista salvo."); });

  if (admin.isLoading) return <div className="h-40 animate-pulse rounded-[10px] bg-sheet" aria-busy />;
  if (!admin.data?.isAdmin) return <EmptyState title="Área dos administradores">Peça acesso ao Administrador Master para gerenciar artistas.</EmptyState>;

  /* ---------- Edição ---------- */
  if (creating || selectedId) {
    const editingEvent = events.data?.events.find(item => item.id === eventId);
    return <div>
      <PageHeader
        back={<button type="button" onClick={closeEditor} className="inline-flex items-center gap-1 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Artistas</button>}
        title={creating ? "Novo artista" : selected?.artist_name ?? "Artista"}
        actions={<>
          {selected?.status === "published" && <Button asChild variant="outline"><Link to="/artistas/$slug" params={{ slug: selected.slug }} target="_blank"><ExternalLink /> Ver página pública</Link></Button>}
          {tab === "profile" && <Button type="submit" form="artist-form" disabled={busy}>{busy ? "Salvando…" : creating ? "Criar artista" : "Salvar artista"}</Button>}
        </>}
      />
      {!creating && <div role="tablist" aria-label="Seções do artista" className="mb-6 flex gap-1 border-b border-line">
        {(["profile", "events", "gallery"] as const).map(t => <button type="button" key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px h-11 border-b-2 px-3.5 text-sm font-medium ${tab === t ? "border-violet text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}>{t === "profile" ? "Perfil" : t === "events" ? "Agenda" : "Galeria"}</button>)}
      </div>}

      {tab === "profile" && <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <form id="artist-form" onSubmit={e => { e.preventDefault(); saveArtist(); }} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          {fields.map(key => <div key={key} className={key === "bio" ? "sm:col-span-2" : ""}><Field label={labels[key]}>{key === "bio" ? <textarea rows={4} className={input} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /> : <input className={input} value={form[key]} required={key === "artist_name" || key === "slug"} type={key === "contact_email" ? "email" : "text"} inputMode={key === "phone" || key === "whatsapp" ? "tel" : undefined} maxLength={key === "state" ? 2 : undefined} onChange={e => setForm(f => ({ ...f, [key]: e.target.value, ...(key === "artist_name" && !selectedId && !f.slug ? { slug: slugify(e.target.value) } : {}) }))} />}{key === "slug" && <span className="text-xs font-normal text-ink-soft">agenda.efcsys.com/artistas/{form.slug || "nome-do-artista"}</span>}</Field></div>)}
          <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-[var(--violet)]" checked={form.show_booking_contact} onChange={e => setForm(f => ({ ...f, show_booking_contact: e.target.checked }))} /> Mostrar contato para contratação na página pública</label>
          {selected && <label className="grid gap-2 text-sm font-medium sm:col-span-2">Situação<select className={input} value={selected.status} disabled={busy} onChange={e => run(async () => { await statusFn({ data: { id: selected.id, status: e.target.value as ManagedArtist["status"] } }); await refresh(); toast.success("Situação atualizada."); })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        </form>
        <aside className="grid content-start gap-3">
          <h2 className="section-title">Como o público vê</h2>
          <div className="pi-stage overflow-hidden rounded-2xl bg-stage text-white">
            {selected?.cover_url && <img src={selected.cover_url} alt="" className="pi-duotone h-28 w-full object-cover" />}
            <div className="grid gap-2 p-5"><span className="pi-strip !h-2 !w-20" /><span className="text-sm text-[#c9c1dd]">{[form.genre, [form.city, form.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Gênero · Cidade"}</span><p className="poster-title text-[56px] break-words">{form.artist_name || "Nome do artista"}</p></div>
          </div>
          {selected ? <div className="grid grid-cols-2 gap-3"><UploadField label="Trocar foto" src={selected.avatar_url} disabled={busy} onFile={file => run(() => upload(file, "avatar"))} /><UploadField label="Trocar capa" src={selected.cover_url} disabled={busy} onFile={file => run(() => upload(file, "cover"))} /></div> : <p className="text-sm text-ink-soft">Depois de criar o artista você poderá enviar foto e capa.</p>}
        </aside>
      </div>}

      {tab === "events" && selected && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-3">
          <h2 className="section-title">Shows de {selected.artist_name}</h2>
          {events.isLoading ? <div className="h-28 animate-pulse rounded-2xl bg-sheet" /> : !events.data?.events.length ? <EmptyState title="Nenhum show cadastrado">Os shows publicados aparecem na página pública do artista.</EmptyState> :
            <ul className="grid gap-3">{events.data.events.map(item => <li key={item.id}><Ingresso start={item.starts_at} title={item.title} place={[item.venue, [item.city, item.state].filter(Boolean).join(" – ")].filter(Boolean).join(", ")} status={item.status === "cancelled" ? "cancelled" : item.is_published ? "published" : "draft"} accent={accentFor(selected.id)} actions={<>
              <IconButton label="Editar show" onClick={() => { setEvent(eventForm(item)); setEventId(item.id); }}><Pencil className="h-[18px] w-[18px]" /></IconButton>
              {item.is_published && selected.status === "published" && <a className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink" aria-label={`Abrir página de ${item.title}`} title="Abrir página do show" href={`/artistas/${selected.slug}/eventos/${item.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-[18px] w-[18px]" /></a>}
              <IconButton label="Excluir show" disabled={busy} onClick={() => { if (window.confirm(`Excluir o show "${item.title}"? Ele sai da agenda e da página pública.`)) run(async () => { await removeEventFn({ data: { id: item.id } }); if (eventId === item.id) { setEventId(null); setEvent(emptyEvent()); } await refreshEvents(); toast.success("Show excluído."); }); }}><Trash2 className="h-[18px] w-[18px]" /></IconButton>
            </>} /></li>)}</ul>}
        </section>
        <form onSubmit={e => { e.preventDefault(); run(async () => { const result = await saveEventFn({ data: { artist_id: selected.id, ...(eventId ? { id: eventId } : {}), ...Object.fromEntries(eventFields.filter(key => !["title", "slug", "starts_at", "ends_at"].includes(key)).map(key => [key, event[key].trim() || null])), title: event.title.trim(), slug: event.slug.trim(), starts_at: new Date(event.starts_at).toISOString(), ends_at: event.ends_at ? new Date(event.ends_at).toISOString() : null, status: event.status, is_published: event.is_published } }); setEventId(result.id); await refreshEvents(); toast.success("Show salvo."); }); }} className="panel grid content-start gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <h2 className="section-title sm:col-span-2">{eventId ? `Editar ${editingEvent?.title ?? "show"}` : "Adicionar show"}</h2>
          {eventFields.map(key => <div key={key} className={key === "description" || key === "title" ? "sm:col-span-2" : ""}><Field label={eventLabels[key]}>{key === "description" ? <textarea className={input} rows={3} value={event[key]} onChange={e => setEvent(f => ({ ...f, [key]: e.target.value }))} /> : <input className={input} type={key === "starts_at" || key === "ends_at" ? "datetime-local" : key === "maps_url" || key === "ticket_url" ? "url" : "text"} required={key === "title" || key === "slug" || key === "starts_at"} value={event[key]} onChange={e => setEvent(f => ({ ...f, [key]: e.target.value, ...(key === "title" && !eventId && !f.slug ? { slug: slugify(e.target.value) } : {}) }))} />}</Field></div>)}
          <Field label="Situação"><select className={input} value={event.status} onChange={e => setEvent(f => ({ ...f, status: e.target.value as EventForm["status"] }))}><option value="scheduled">Agendado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></Field>
          <label className="flex items-center gap-3 self-end pb-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--violet)]" checked={event.is_published} onChange={e => setEvent(f => ({ ...f, is_published: e.target.checked }))} /> Publicar na página do artista</label>
          {eventId && <div className="sm:col-span-2"><UploadField label="Arte do show" src={editingEvent?.banner_url} disabled={busy} onFile={file => run(() => upload(file, "banner", eventId))} /></div>}
          <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar show"}</Button>{eventId && <Button type="button" variant="outline" onClick={() => { setEvent(emptyEvent()); setEventId(null); }}>Adicionar outro show</Button>}</div>
        </form>
      </div>}

      {tab === "gallery" && selected && <div className="grid gap-6">
        <div className="panel grid gap-4 p-5 sm:p-6">
          <h2 className="section-title">Adicionar à galeria</h2>
          <div className="flex flex-wrap items-end gap-4">
            <UploadField label="Enviar foto" disabled={busy} onFile={file => run(() => upload(file, "gallery"))} />
            <form className="flex flex-1 flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); run(async () => { await addMediaFn({ data: { artist_id: selected.id, kind: mediaKind, external_url: mediaUrl } }); setMediaUrl(""); await refreshMedia(); toast.success("Mídia adicionada."); }); }}>
              <div className="min-w-[240px] flex-1"><Field label="Link de foto ou vídeo"><input type="url" required className={input} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://youtube.com/..." /></Field></div>
              <Field label="Tipo"><select className={input} value={mediaKind} onChange={e => setMediaKind(e.target.value as "image" | "video")}><option value="video">Vídeo</option><option value="image">Foto</option></select></Field>
              <Button disabled={busy} type="submit"><Plus /> Adicionar link</Button>
            </form>
          </div>
        </div>
        {!media.data?.media.length ? <EmptyState title="Galeria vazia">Fotos e vídeos aparecem no fim da página pública do artista.</EmptyState> :
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{media.data.media.map(item => <li key={String(item.id)} className="panel relative overflow-hidden">{item.kind === "image" && (item.display_url || item.external_url) ? <img className="aspect-square w-full object-cover" src={String(item.display_url || item.external_url)} alt="Foto da galeria" /> : <a className="flex aspect-square items-center justify-center gap-1 text-sm font-medium text-violet" href={String(item.external_url)} target="_blank" rel="noreferrer">Abrir vídeo <ExternalLink className="h-4 w-4" /></a>}<div className="absolute top-1 right-1 rounded-md bg-sheet"><IconButton label="Remover da galeria" disabled={busy} onClick={() => { if (window.confirm("Remover esta mídia da galeria?")) run(async () => { await removeMediaFn({ data: { id: String(item.id) } }); await refreshMedia(); toast.success("Mídia removida."); }); }}><Trash2 className="h-[18px] w-[18px]" /></IconButton></div></li>)}</ul>}
      </div>}
    </div>;
  }

  /* ---------- Lista ---------- */
  const all = artists.data?.artists ?? [];
  const list = all.filter(a => (statusFilter === "all" || a.status === statusFilter) && `${a.artist_name} ${a.slug} ${a.city ?? ""} ${a.genre ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const published = all.filter(a => a.status === "published").length;
  return <div>
    <PageHeader title="Artistas" description={artists.data ? `${all.length} artista${all.length === 1 ? "" : "s"} · ${published} publicado${published === 1 ? "" : "s"}` : undefined} actions={<Button onClick={() => { setCreating(true); setSelectedId(null); setForm(emptyArtist()); setTab("profile"); }}><Plus /> Novo artista</Button>} />
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="grid min-w-[220px] flex-1 gap-2 text-sm font-medium sm:max-w-sm">Buscar artista<span className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" /><input className={`${input} w-full pl-9`} placeholder="Nome, cidade ou gênero" value={search} onChange={e => setSearch(e.target.value)} /></span></label>
      <label className="grid gap-2 text-sm font-medium">Situação<select className={input} value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">Todas</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {artists.isLoading ? <div className="panel h-64 animate-pulse" aria-busy /> : artists.isError ? <EmptyState title="Não foi possível carregar os artistas" actions={<Button variant="outline" onClick={() => refresh()}>Tentar de novo</Button>}>Verifique a conexão e tente de novo.</EmptyState> : !all.length ? <EmptyState title="Nenhum artista ainda" actions={<Button onClick={() => { setCreating(true); setForm(emptyArtist()); setTab("profile"); }}><Plus /> Novo artista</Button>}>Cada artista ganha uma página pública com a agenda de shows.</EmptyState> : !list.length ? <EmptyState title="Nenhum artista encontrado" actions={<Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Limpar filtros</Button>}>Nenhum artista corresponde à busca.</EmptyState> :
      <ul className="panel divide-y divide-line">{list.map(a => <li key={a.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
        {a.avatar_url ? <img className="h-11 w-11 shrink-0 rounded-full object-cover" alt="" src={a.avatar_url} /> : <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-poster text-lg font-bold text-white ${AV_BG[accentFor(a.id)]}`}>{a.artist_name.slice(0, 1).toUpperCase()}</span>}
        <button type="button" onClick={() => openArtist(a)} className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{a.artist_name}</span><span className="block truncate text-sm text-ink-soft">{[a.genre, [a.city, a.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || `/${a.slug}`}</span></button>
        <Status kind={a.status === "published" ? "published" : a.status === "draft" ? "draft" : "hidden"} label={statuses[a.status]} />
        <span className="hidden items-center sm:flex">
          <IconButton label="Editar artista" onClick={() => openArtist(a)}><Pencil className="h-[18px] w-[18px]" /></IconButton>
          <IconButton label="Agenda do artista" onClick={() => openArtist(a, "events")}><CalendarDays className="h-[18px] w-[18px]" /></IconButton>
          {a.status === "published" && <><IconButton label="Copiar link da agenda" onClick={() => run(() => copy(link(a)))}><Copy className="h-[18px] w-[18px]" /></IconButton><IconButton label="Compartilhar agenda" onClick={() => run(() => share(a))}><Share2 className="h-[18px] w-[18px]" /></IconButton></>}
        </span>
      </li>)}</ul>}
  </div>;
}

function UploadField({ label, src, disabled, onFile }: { label: string; src?: string | null; disabled: boolean; onFile: (file: File) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-md border border-line bg-sheet p-2 pr-3 text-sm font-medium hover:border-ink-soft ${disabled ? "pointer-events-none opacity-50" : ""}`}>{src ? <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-paper text-ink-soft"><ImagePlus className="h-[18px] w-[18px]" /></span>}<span>{label}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} /></label>;
}
