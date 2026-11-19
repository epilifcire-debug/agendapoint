import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { BrandMark, EfcsysSignature, logoUrl } from "@/components/brand";
import { GOOGLE_ENABLED } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — Agenda Point do Ingresso" },
      {
        name: "description",
        content:
          "Acesse sua conta administrativa na Agenda Point do Ingresso para gerenciar artistas e agendas.",
      },
      { property: "og:title", content: "Entrar — Agenda Point do Ingresso" },
      { property: "og:description", content: "Acesse sua conta administrativa na Agenda Point do Ingresso." },
      { property: "og:url", content: "https://agenda.efcsys.com/login" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agenda.efcsys.com/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  // If already signed in, jump to dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      return; // redireciona para o Google
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no login com Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-2">
      <aside className="pi-stage hidden flex-col gap-5 bg-stage p-10 text-white lg:flex">
        <span className="flex items-center gap-2.5">
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-full bg-white" />
          <span className="text-sm font-medium">Point do Ingresso</span>
        </span>
        <span className="pi-strip mt-auto" />
        <h1 className="poster-title text-[88px]">Agenda de artistas</h1>
        <p className="text-[#c9c1dd]">Gestão dos eventos e página pública para o fã.</p>
        <EfcsysSignature className="mt-6 text-white/60 hover:text-white" />
      </aside>

      <main className="pt-safe flex flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> Início</Link>
          <BrandMark className="lg:hidden" compact />
        </div>
        <div className="mx-auto grid w-full max-w-[360px] flex-1 content-center gap-4 py-10">
          <h2 className="page-title">Entrar</h2>
          {GOOGLE_ENABLED && <>
            <button type="button" onClick={handleGoogle} disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-line bg-sheet text-sm font-medium hover:border-ink-soft disabled:opacity-60">
              <GoogleIcon /> Entrar com Google
            </button>
            <p className="text-center text-xs text-ink-soft">ou com e-mail</p>
          </>}
          <form className="grid gap-4" onSubmit={handleEmailSubmit}>
            <Field label="E-mail">
              <input type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="nome@empresa.com" className="h-11 w-full rounded-md border border-line bg-sheet px-3 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20" />
            </Field>
            <Field label="Senha">
              <div className="relative">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="h-11 w-full rounded-md border border-line bg-sheet pr-12 pl-3 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-1 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-violet disabled:opacity-60">
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <p className="text-center text-xs leading-relaxed text-ink-soft">
            Ao entrar você concorda com os <Link to="/termos" className="text-ink underline-offset-4 hover:underline">Termos</Link> e a <Link to="/privacidade" className="text-ink underline-offset-4 hover:underline">Política de Privacidade</Link>.
          </p>
        </div>
        <EfcsysSignature className="mx-auto lg:hidden" />
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c6.9 0 9.1-4.8 9.1-7.3 0-.5-.05-.9-.13-1.2H12z" />
    </svg>
  );
}
