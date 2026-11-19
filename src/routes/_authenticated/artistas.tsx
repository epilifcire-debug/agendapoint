import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Copy, ExternalLink, ImagePlus, Pencil, Plus, Search, Share2, Trash2, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/brand";
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

const input = "w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-[0.8125rem] font-semibold"><span>{label}</span>{children}</label>; }
const statusTone: Record<ManagedArtist["status"], string> = { draft: "bg-muted text-muted-foreground", published: "bg-success/15 text-success", hidden: "bg-warning/15 text-warning", archived: "bg-destructive/10 text-destructive" };
function StatusBadge({ status }: { status: ManagedArtist["status"] }) { return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone[status]}`}>{statuses[status]}</span>; }

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
  if (admin.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!admin.data?.isAdmin) return <p className="text-muted-foreground">Área restrita a administradores.</p>;
  return <div className="space-y-8">
    <PageHeader eyebrow="Gestão" title="Artistas" description={admin.data?.isMaster ? "Todos os artistas da plataforma." : "Os artistas que você gerencia."} actions={<Button onClick={() => { setCreating(true); setSelectedId(null); setForm(emptyArtist()); setTab("profile"); }}><Plus /> Novo artista</Button>} />
    {(creating || selectedId) && <section className="panel animate-rise space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{creating ? "Cadastro" : "Editando"}</p><h2 className="section-title mt-1 text-2xl">{creating ? "Novo artista" : selected?.artist_name ?? "Artista"}</h2></div><Button variant="outline" onClick={() => { setCreating(false); setSelectedId(null); }}>Fechar</Button></div>
      {!creating && <div role="tablist" aria-label="Gerenciar artista" className="inline-flex rounded-2xl bg-muted p-1">{(["profile", "events", "gallery"] as const).map(t => <button type="button" key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 rounded-xl px-4 text-sm font-semibold transition-colors ${tab === t ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}>{t === "profile" ? "Perfil" : t === "events" ? "Agenda" : "Galeria"}</button>)}</div>}
      {tab === "profile" && <div className="space-y-6">
        {selected && <div className="flex flex-wrap gap-6"><UploadField label="Foto de perfil" src={selected.avatar_url} disabled={busy} onFile={file => run(() => upload(file, "avatar"))} /><UploadField label="Imagem de capa" src={selected.cover_url} disabled={busy} onFile={file => run(() => upload(file, "cover"))} /></div>}
        <form onSubmit={e => { e.preventDefault(); run(async () => { const data = { ...form, ...Object.fromEntries(fields.filter(key => !["artist_name", "slug"].includes(key)).map(key => [key, form[key].trim() || null])), artist_name: form.artist_name.trim(), slug: form.slug.trim() }; if (selectedId) await updateFn({ data: { id: selectedId, ...data } }); else { const created = await createFn({ data }); setSelectedId(created.id); setCreating(false); } await refresh(); toast.success("Artista salvo."); }); }} className="grid gap-4 sm:grid-cols-2">
          {fields.map(key => <div key={key} className={key === "bio" ? "sm:col-span-2" : ""}><Field label={labels[key]}>{key === "bio" ? <textarea rows={4} className={input} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /> : <input className={input} value={form[key]} required={key === "artist_name" || key === "slug"} type={key === "contact_email" ? "email" : "text"} maxLength={key === "state" ? 2 : undefined} onChange={e => setForm(f => ({ ...f, [key]: e.target.value, ...(key === "artist_name" && !selectedId && !f.slug ? { slug: slugify(e.target.value) } : {}) }))} />}</Field></div>)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_booking_contact} onChange={e => setForm(f => ({ ...f, show_booking_contact: e.target.checked }))} /> Exibir contato para contratação</label>
          <div className="sm:col-span-2"><Button disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar artista"}</Button></div>
        </form>
      </div>}
      {tab === "events" && selected && <div className="space-y-6"><h3 className="section-title">Agenda de {selected.artist_name}</h3>
        <form onSubmit={e => { e.preventDefault(); run(async () => { const result = await saveEventFn({ data: { artist_id: selected.id, ...(eventId ? { id: eventId } : {}), ...Object.fromEntries(eventFields.filter(key => !["title", "slug", "starts_at", "ends_at"].includes(key)).map(key => [key, event[key].trim() || null])), title: event.title.trim(), slug: event.slug.trim(), starts_at: new Date(event.starts_at).toISOString(), ends_at: event.ends_at ? new Date(event.ends_at).toISOString() : null, status: event.status, is_published: event.is_published } }); setEventId(result.id); await refreshEvents(); toast.success("Evento salvo."); }); }} className="grid gap-4 sm:grid-cols-2">
          {eventFields.map(key => <div key={key} className={key === "description" ? "sm:col-span-2" : ""}><Field label={eventLabels[key]}>{key === "description" ? <textarea className={input} rows={3} value={event[key]} onChange={e => setEvent(f => ({ ...f, [key]: e.target.value }))} /> : <input className={input} type={key === "starts_at" || key === "ends_at" ? "datetime-local" : key === "maps_url" || key === "ticket_url" ? "url" : "text"} required={key === "title" || key === "slug" || key === "starts_at"} value={event[key]} onChange={e => setEvent(f => ({ ...f, [key]: e.target.value, ...(key === "title" && !eventId && !f.slug ? { slug: slugify(e.target.value) } : {}) }))} />}</Field></div>)}
          <Field label="Situação"><select className={input} value={event.status} onChange={e => setEvent(f => ({ ...f, status: e.target.value as EventForm["status"] }))}><option value="scheduled">Agendado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={event.is_published} onChange={e => setEvent(f => ({ ...f, is_published: e.target.checked }))} /> Publicar evento</label>
          {eventId && <UploadField label="Arte do evento" src={events.data?.events.find(item => item.id === eventId)?.banner_url} disabled={busy} onFile={file => run(() => upload(file, "banner", eventId))} />}
          <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>Salvar evento</Button><Button type="button" variant="outline" onClick={() => { setEvent(emptyEvent()); setEventId(null); }}>Novo evento</Button></div>
        </form>
        <ul className="divide-y divide-border">{events.data?.events.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong>{item.title}</strong><p className="text-sm text-muted-foreground">{new Date(item.starts_at).toLocaleString("pt-BR")} · {item.is_published ? "Publicado" : "Oculto"}</p></div><div className="flex gap-1"><Button title="Editar evento" aria-label={`Editar ${item.title}`} size="icon" variant="ghost" onClick={() => { setEvent(eventForm(item)); setEventId(item.id); }}><Pencil /></Button>{item.is_published && selected.status === "published" && <Button asChild title="Ver evento" size="icon" variant="ghost"><Link to="/artistas/$slug/eventos/$eventSlug" params={{ slug: selected.slug, eventSlug: item.slug }} target="_blank"><ExternalLink /></Link></Button>}<Button title="Excluir evento" aria-label={`Excluir ${item.title}`} size="icon" variant="ghost" disabled={busy} onClick={() => { if (window.confirm(`Excluir ${item.title}?`)) run(async () => { await removeEventFn({ data: { id: item.id } }); if (eventId === item.id) { setEventId(null); setEvent(emptyEvent()); } await refreshEvents(); toast.success("Evento excluído."); }); }}><Trash2 /></Button></div></li>)}</ul>
      </div>}
      {tab === "gallery" && selected && <div className="space-y-5"><h3 className="section-title">Galeria de {selected.artist_name}</h3><UploadField label="Adicionar foto" disabled={busy} onFile={file => run(() => upload(file, "gallery"))} /><form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); run(async () => { await addMediaFn({ data: { artist_id: selected.id, kind: mediaKind, external_url: mediaUrl } }); setMediaUrl(""); await refreshMedia(); toast.success("Mídia adicionada."); }); }}><Field label="Link de foto ou vídeo"><input type="url" required className={input} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} /></Field><Field label="Tipo"><select className={input} value={mediaKind} onChange={e => setMediaKind(e.target.value as "image" | "video")}><option value="video">Vídeo</option><option value="image">Foto</option></select></Field><Button disabled={busy} type="submit"><Plus /> Adicionar</Button></form><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{media.data?.media.map(item => <div key={String(item.id)} className="relative overflow-hidden rounded-2xl border border-border p-2">{item.kind === "image" && (item.display_url || item.external_url) ? <img className="aspect-square w-full object-cover" src={String(item.display_url || item.external_url)} alt="Foto da galeria" /> : <a className="flex aspect-square items-center justify-center text-sm text-primary" href={String(item.external_url)} target="_blank" rel="noreferrer">Ver vídeo <ExternalLink className="ml-1 h-4 w-4" /></a>}<Button title="Remover mídia" aria-label="Remover mídia" variant="ghost" size="icon" disabled={busy} onClick={() => run(async () => { await removeMediaFn({ data: { id: String(item.id) } }); await refreshMedia(); toast.success("Mídia removida."); })}><Trash2 /></Button></div>)}</div></div>}
    </section>}
    <section className="panel space-y-4 p-4 sm:p-6"><div className="relative max-w-md"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={`${input} pl-9`} aria-label="Buscar artista" placeholder="Buscar artista" value={search} onChange={e => setSearch(e.target.value)} /></div>{artists.isLoading ? <p className="text-muted-foreground">Carregando artistas…</p> : artists.isError ? <p role="alert" className="text-destructive">Não foi possível carregar os artistas.</p> : !artists.data?.artists.length ? <EmptyState icon={<Users className="h-5 w-5" />} title="Nenhum artista cadastrado">Use “Novo artista” para criar o primeiro perfil.</EmptyState> : <ul className="divide-y divide-border">{artists.data.artists.filter(a => `${a.artist_name} ${a.slug} ${a.city ?? ""}`.toLowerCase().includes(search.toLowerCase())).map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3">{a.avatar_url ? <img className="h-12 w-12 rounded-full object-cover ring-2 ring-border" alt="" src={a.avatar_url} /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-muted"><ImagePlus className="h-5 w-5" /></div>}<div className="min-w-0"><strong className="block truncate">{a.artist_name}</strong><span className="flex items-center gap-2 text-sm text-muted-foreground"><span className="truncate">/{a.slug}</span><StatusBadge status={a.status} /></span></div></div><div className="flex flex-wrap items-center gap-1"><Button variant="ghost" size="icon" title="Editar artista" aria-label={`Editar ${a.artist_name}`} onClick={() => { setSelectedId(a.id); setCreating(false); setTab("profile"); setForm(artistForm(a)); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil /></Button><Button variant="ghost" size="icon" title="Gerenciar agenda" aria-label={`Agenda de ${a.artist_name}`} onClick={() => { setSelectedId(a.id); setCreating(false); setTab("events"); setForm(artistForm(a)); setEvent(emptyEvent()); setEventId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}><CalendarDays /></Button>{a.status === "published" && <><Button asChild variant="ghost" size="icon" title="Ver página pública"><Link to="/artistas/$slug" params={{ slug: a.slug }} target="_blank"><ExternalLink /></Link></Button><Button variant="ghost" size="icon" title="Copiar link" aria-label={`Copiar link de ${a.artist_name}`} onClick={() => run(() => copy(link(a)))}><Copy /></Button><Button variant="ghost" size="icon" title="Compartilhar agenda" aria-label={`Compartilhar agenda de ${a.artist_name}`} onClick={() => run(() => share(a))}><Share2 /></Button></>}<select aria-label={`Status de ${a.artist_name}`} className="h-9 rounded-xl border border-input bg-background px-2.5 text-xs font-semibold" value={a.status} disabled={busy} onChange={e => run(async () => { await statusFn({ data: { id: a.id, status: e.target.value as ManagedArtist["status"] } }); await refresh(); toast.success("Status atualizado."); })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></li>)}</ul>}</section>
  </div>;
}

function UploadField({ label, src, disabled, onFile }: { label: string; src?: string | null; disabled: boolean; onFile: (file: File) => void }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span><span className="flex items-center gap-3">{src && <img src={src} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border" />}<span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input px-3.5 text-xs font-semibold transition-colors hover:border-ring hover:bg-muted"><ImagePlus className="h-4 w-4" /> Escolher imagem</span></span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} /></label>;
}
