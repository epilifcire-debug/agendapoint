import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Save, Upload, User as UserIcon } from "lucide-react";
import { getMyProfile, updateMyProfile, setCoverUrl } from "@/lib/profile.functions";
import { setAvatarUrl } from "@/lib/googleCalendar.functions";
import { supabase } from "@/integrations/supabase/client";
import { shareTargets } from "@/lib/share";
import { amIAdmin } from "@/lib/admin.functions";
import { PageHeader } from "@/components/brand";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Meu perfil — Agenda Point do Ingresso" },
      { name: "description", content: "Edite seus dados de artista e preferências na Agenda Point do Ingresso." },
       { property: "og:title", content: "Meu perfil — Agenda Point do Ingresso" },
       { property: "og:description", content: "Gerencie seus dados na Agenda Point do Ingresso." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ProfileForm = {
  artist_name: string;
  handle: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  cover_fit: "cover" | "contain";
  cover_zoom: number;
  whatsapp: string;
  phone: string;
  show_whatsapp: boolean;
  contact_email: string;
  instagram: string;
  youtube: string;
  spotify: string;
  tiktok: string;
  soundcloud: string;
  twitter: string;
  city: string;
  genre: string;
};

const empty: ProfileForm = {
  artist_name: "", handle: "", bio: "", avatar_url: "", cover_url: "", cover_fit: "cover", cover_zoom: 100,
  whatsapp: "", phone: "", show_whatsapp: false, contact_email: "", instagram: "", youtube: "", spotify: "",
  tiktok: "", soundcloud: "", twitter: "", city: "", genre: "",
};

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2)}`;
  return `(${d.slice(0, 2)})${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

function ProfilePage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const setAvatarFn = useServerFn(setAvatarUrl);
  const setCoverFn = useServerFn(setCoverUrl);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });
  const adminFn = useServerFn(amIAdmin);
  const adminQ = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  const isAdmin = adminQ.data?.isAdmin === true;
  const [form, setForm] = useState<ProfileForm>(empty);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data) {
      setAvatarPreview((profile.data as any).avatar_display_url ?? "");
      setCoverPreview(isAdmin ? "" : ((profile.data as any).cover_display_url ?? ""));
      setForm({
        artist_name: profile.data.artist_name ?? "",
        handle: profile.data.handle ?? "",
        bio: profile.data.bio ?? "",
        avatar_url: profile.data.avatar_url ?? "",
        cover_url: (profile.data as any).cover_url ?? "",
        cover_fit: ((profile.data as any).cover_fit === "contain" ? "contain" : "cover"),
        cover_zoom: Number((profile.data as any).cover_zoom ?? 100),
        whatsapp: profile.data.whatsapp ?? "",
        phone: maskPhone(String((profile.data as any).phone ?? "")),
        show_whatsapp: Boolean((profile.data as any).show_whatsapp),
        contact_email: profile.data.contact_email ?? "",
        instagram: profile.data.instagram ?? "",
        youtube: profile.data.youtube ?? "",
        spotify: profile.data.spotify ?? "",
        tiktok: (profile.data as any).tiktok ?? "",
        soundcloud: (profile.data as any).soundcloud ?? "",
        twitter: (profile.data as any).twitter ?? "",
        city: profile.data.city ?? "",
        genre: profile.data.genre ?? "",
      });
    }
  }, [profile.data, isAdmin]);

  // Uploads always go to `<user_id>/...` inside the images bucket, so an artist
  // can only write inside their own folder (enforced by storage policies).
  async function uploadImage(file: File, kind: "avatar" | "cover") {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Sessão expirada. Entre novamente.");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${uid}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) throw new Error("Não foi possível enviar a imagem. Tente novamente.");
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24);
    return { path, preview: signed?.signedUrl ?? "" };
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const { path, preview } = await uploadImage(file, "avatar");
      await setAvatarFn({ data: { avatar_url: path } });
      setForm((f) => ({ ...f, avatar_url: path }));
      setAvatarPreview(preview);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Foto atualizada com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Máximo 8MB.");
      return;
    }
    setUploadingCover(true);
    try {
      const { path, preview } = await uploadImage(file, "cover");
      await setCoverFn({ data: { cover_url: path } });
      setForm((f) => ({ ...f, cover_url: path }));
      setCoverPreview(preview);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Imagem de fundo atualizada com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploadingCover(false);
    }
  }


  async function removeCover() {
    await setCoverFn({ data: { cover_url: null } });
    setForm((f) => ({ ...f, cover_url: "" }));
    setCoverPreview("");
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Imagem de fundo removida.");
  }

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = {
        ...form,
        handle: form.handle || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        // Administrators have no public page, so no watermark fields are saved.
        ...(isAdmin
          ? { cover_url: null, cover_fit: undefined, cover_zoom: undefined }
          : { cover_url: form.cover_url || null, cover_fit: form.cover_fit, cover_zoom: form.cover_zoom }),

        whatsapp: form.whatsapp || null,
        contact_email: form.contact_email || null,
        instagram: form.instagram || null,
        youtube: form.youtube || null,
        spotify: form.spotify || null,
        tiktok: form.tiktok || null,
        soundcloud: form.soundcloud || null,
        twitter: form.twitter || null,
        city: form.city || null,
        genre: form.genre || null,
      };
      await updateFn({ data: cleaned });
    },
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const update = (k: keyof ProfileForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Conta" title="Meu perfil" description="Estas informações aparecem na sua página pública." />

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-8">
        <Section title="Foto">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <UserIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Enviar foto"}
              </button>
              <p className="mt-1.5 text-[11px] text-muted-foreground">JPG/PNG até 5MB.</p>
            </div>
          </div>
        </Section>

        {!isAdmin && (
        <Section title="Imagem de fundo (marca d'água)">
          <div className="space-y-4">
            <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted">

              {coverPreview ? (
                <>
                  <div className="absolute inset-0 bg-[#1a1024]" />
                  <img
                    src={coverPreview}
                    alt=""
                    className="absolute inset-0 h-full w-full object-center opacity-20"
                    style={{ objectFit: form.cover_fit, transform: `scale(${form.cover_zoom / 100})`, transformOrigin: "center" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/70">
                    Prévia da marca d'água
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Nenhuma imagem de fundo
                </div>
              )}
            </div>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <Upload className="h-4 w-4" /> {uploadingCover ? "Enviando…" : "Enviar imagem de fundo"}
              </button>
              {coverPreview && (
                <button
                  type="button"
                  onClick={removeCover}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Remover
                </button>
              )}
            </div>
            {coverPreview && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs font-semibold">Posicionamento</div>
                  <div className="flex gap-2">
                    {([
                      { v: "cover", label: "Centralizar (preencher)" },
                      { v: "contain", label: "Encaixar (imagem inteira)" },
                    ] as const).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cover_fit: o.v }))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.cover_fit === o.v
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span>Zoom do fundo</span>
                    <span className="text-muted-foreground">{form.cover_zoom}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={50}
                      max={300}
                      step={5}
                      value={form.cover_zoom}
                      onChange={(e) => setForm((f) => ({ ...f, cover_zoom: Number(e.target.value) }))}
                      className="w-full accent-[hsl(var(--primary))]"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, cover_zoom: 100 }))}
                      className="shrink-0 rounded-lg border border-input px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                    >
                      100%
                    </button>
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Tamanho ideal: 1920×1080 px (16:9), JPG/PNG até 8MB. A imagem aparece esmaecida ao fundo da sua página pública, como marca d'água.
            </p>
          </div>
        </Section>
        )}


        {isAdmin ? (
          <Section title="Identidade">
            <Grid>
              <Field label="Nome *"><Input value={form.artist_name} onChange={update("artist_name")} required /></Field>
            </Grid>
          </Section>
        ) : (
          <>
            <Section title="Identidade">
              <Grid>
                <Field label="Nome artístico *"><Input value={form.artist_name} onChange={update("artist_name")} required /></Field>
                <Field label="@nomeartistico" hint="Só letras, números, _ . -">
                  <Input value={form.handle} onChange={update("handle")} placeholder="ex: luna.vieira" />
                </Field>
                <Field label="Cidade"><Input value={form.city} onChange={update("city")} /></Field>
                <Field label="Gênero musical"><Input value={form.genre} onChange={update("genre")} placeholder="ex: MPB, Sertanejo" /></Field>
              </Grid>
              <Field label="Bio (até 500 caracteres)">
                <textarea
                  value={form.bio}
                  onChange={(e) => update("bio")(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
                />
              </Field>
            </Section>

            <Section title="Sua página pública">
              <PublicUrlField handle={form.handle} />
            </Section>

            <Section title="Contato para shows">
              <Grid>
                <Field label="Telefone" hint="(00)00000-0000">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                    placeholder="(11)99999-9999"
                    inputMode="tel"
                    className="w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
                  />
                </Field>
                <Field label="E-mail de contato"><Input type="email" value={form.contact_email} onChange={update("contact_email")} /></Field>
              </Grid>
              <label className="flex items-start gap-3 rounded-xl border border-input p-3">
                <input
                  type="checkbox"
                  checked={form.show_whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, show_whatsapp: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span>
                  <span className="block text-sm font-semibold">Exibir WhatsApp para contato de shows</span>
                  <span className="block text-xs text-muted-foreground">
                    Quando ativado, o botão de WhatsApp aparece na sua página pública (é necessário ter telefone cadastrado).
                  </span>
                </span>
              </label>
            </Section>

            <Section title="Redes sociais">
              <Grid>
                <Field label="Instagram"><Input value={form.instagram} onChange={update("instagram")} placeholder="@usuario" /></Field>
                <Field label="TikTok"><Input value={form.tiktok} onChange={update("tiktok")} placeholder="@usuario" /></Field>
                <Field label="Twitter / X"><Input value={form.twitter} onChange={update("twitter")} placeholder="@usuario" /></Field>
                <Field label="YouTube"><Input value={form.youtube} onChange={update("youtube")} placeholder="https://youtube.com/@…" /></Field>
                <Field label="Spotify"><Input value={form.spotify} onChange={update("spotify")} placeholder="https://open.spotify.com/artist/…" /></Field>
                <Field label="SoundCloud"><Input value={form.soundcloud} onChange={update("soundcloud")} placeholder="https://soundcloud.com/…" /></Field>
              </Grid>
            </Section>
          </>
        )}

        <div>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
function Input(props: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  // Local mirror + composition guard so dead keys (´ ` ^ ~) and ç work
  // without the parent re-render interrupting the composition.
  const [local, setLocal] = useState(props.value);
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) setLocal(props.value);
  }, [props.value]);

  return (
    <input
      type={props.type ?? "text"}
      value={local}
      required={props.required}
      placeholder={props.placeholder}
      lang="pt-BR"
      autoComplete="off"
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(e) => {
        composing.current = false;
        const v = (e.target as HTMLInputElement).value;
        setLocal(v);
        props.onChange(v);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        if (!composing.current) props.onChange(v);
      }}
      className="w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
    />
  );
}

function PublicUrlField({ handle }: { handle: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const slug = (handle || "").trim();
  const url = slug ? `${origin}/a/${slug}` : "";

  if (!slug) {
    return (
      <p className="text-sm text-muted-foreground">
        Defina seu <strong>@nomeartistico</strong> acima e salve para gerar o link da sua página pública.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Link copiado!");
              } catch {
                toast.error("Não foi possível copiar o link.");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Abrir
          </a>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {shareTargets(url).map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}
