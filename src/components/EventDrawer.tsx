import * as Dialog from "@radix-ui/react-dialog";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listManagedArtists, saveManagedEvent } from "@/lib/managedArtists.functions";

const slugify = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const field = "min-h-11 w-full rounded-md border border-line bg-sheet px-3 py-2.5 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20";

type Form = { artist_id: string; title: string; date: string; time: string; venue: string; city: string; state: string; ticket_url: string; publish: boolean };
const empty = (artistId = ""): Form => ({ artist_id: artistId, title: "", date: "", time: "21:00", venue: "", city: "", state: "", ticket_url: "", publish: false });

/** Painel lateral para adicionar um show sem sair da tela atual. */
export function EventDrawer({ open, onOpenChange, defaultArtistId }: { open: boolean; onOpenChange: (open: boolean) => void; defaultArtistId?: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listManagedArtists);
  const saveFn = useServerFn(saveManagedEvent);
  const artists = useQuery({ queryKey: ["managed-artists"], queryFn: () => listFn(), enabled: open });
  const [form, setForm] = useState<Form>(empty(defaultArtistId));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(empty(defaultArtistId));
      setTouched({});
    }
  }, [open, defaultArtistId]);
  useEffect(() => {
    if (open && !form.artist_id && artists.data?.artists.length) setForm((f) => ({ ...f, artist_id: artists.data!.artists[0].id }));
  }, [open, artists.data, form.artist_id]);

  const errors = {
    title: !form.title.trim() ? "Dê um nome ao show." : "",
    date: !form.date ? "Escolha a data do show." : "",
    ticket_url: form.ticket_url && !/^https?:\/\//.test(form.ticket_url) ? "Use um link completo, como https://pointdoingresso.com.br/..." : "",
  };
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : "");
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ title: true, date: true, ticket_url: true });
    const first = (Object.keys(errors) as Array<keyof typeof errors>).find((k) => errors[k]);
    if (first) {
      document.getElementById(`ev-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.time || "00:00"}:00-03:00`).toISOString();
      await saveFn({
        data: {
          artist_id: form.artist_id,
          title: form.title.trim(),
          slug: `${slugify(form.title)}-${form.date.replaceAll("-", "")}`.slice(0, 80),
          starts_at: startsAt,
          ends_at: null,
          venue: form.venue.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
          address: null,
          maps_url: null,
          ticket_url: form.ticket_url.trim() || null,
          description: null,
          status: "scheduled",
          is_published: form.publish,
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-agenda"] }),
        qc.invalidateQueries({ queryKey: ["admin-dash-agenda"] }),
        qc.invalidateQueries({ queryKey: ["managed-events"] }),
      ]);
      toast.success(form.publish ? "Show publicado." : "Show salvo como rascunho.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o show. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#110a22]/50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] animate-drawer flex-col border-l border-line bg-sheet text-ink outline-none">
          <header className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
            <Dialog.Title className="section-title">Adicionar show</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink" aria-label="Fechar">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </header>
          <Dialog.Description className="sr-only">Cadastre um show para um artista.</Dialog.Description>
          <form id="event-drawer" onSubmit={submit} noValidate className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
            <label className="grid gap-2 text-sm font-medium">
              Artista
              <select className={field} value={form.artist_id} onChange={set("artist_id")}>
                {artists.isLoading && <option>Carregando…</option>}
                {artists.data?.artists.map((a) => <option key={a.id} value={a.id}>{a.artist_name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Nome do show
              <input id="ev-title" className={field} value={form.title} onChange={set("title")} onBlur={() => setTouched((t) => ({ ...t, title: true }))} aria-invalid={!!show("title")} placeholder="Festival de Verão" />
              {show("title") && <span className="text-sm font-normal text-pink-ink">{show("title")}</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Data
                <input id="ev-date" type="date" className={field} value={form.date} onChange={set("date")} onBlur={() => setTouched((t) => ({ ...t, date: true }))} aria-invalid={!!show("date")} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Horário
                <input type="time" className={field} value={form.time} onChange={set("time")} />
              </label>
              {show("date") && <span className="col-span-2 -mt-1 text-sm text-pink-ink">{show("date")}</span>}
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Local
              <input className={field} value={form.venue} onChange={set("venue")} placeholder="Arena Norte" />
            </label>
            <div className="grid grid-cols-[1fr_88px] gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Cidade
                <input className={field} value={form.city} onChange={set("city")} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                UF
                <input className={field} value={form.state} onChange={set("state")} maxLength={2} placeholder="SE" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Link do ingresso
              <input id="ev-ticket_url" type="url" inputMode="url" className={field} value={form.ticket_url} onChange={set("ticket_url")} onBlur={() => setTouched((t) => ({ ...t, ticket_url: true }))} placeholder="https://pointdoingresso.com.br/..." />
              {show("ticket_url") && <span className="text-sm font-normal text-pink-ink">{show("ticket_url")}</span>}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[var(--violet)]" checked={form.publish} onChange={set("publish")} />
              Publicar na página do artista
            </label>
          </form>
          <footer className="pb-safe flex justify-end gap-2 border-t border-line p-4">
            <Dialog.Close asChild>
              <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button type="submit" form="event-drawer" disabled={saving}>{saving ? "Salvando…" : "Salvar show"}</Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Converte o status de um evento da agenda no status visual. */
export function eventStatusKind(e: { status?: string; isPublished?: boolean }) {
  if (e.status === "cancelled") return "cancelled" as const;
  if (e.isPublished === false) return "draft" as const;
  return "published" as const;
}
