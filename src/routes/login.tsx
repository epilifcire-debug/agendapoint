import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { BrandMark, EfcsysSignature } from "@/components/brand";
import { COLOR_BENDS_PURPLE, ColorBends } from "@/components/ColorBends";
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
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="public-agenda relative isolate hidden overflow-hidden bg-background p-10 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 -z-10"><ColorBends {...COLOR_BENDS_PURPLE} /></div>
        <div aria-hidden className="bg-grain absolute inset-0 -z-10" />
        <BrandMark tone="inverse" />
        <div className="max-w-md">
          <p className="eyebrow text-white/60">Área administrativa</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-white">Sua agenda oficial, sempre em dia.</h1>
          <ul className="mt-10 space-y-4 text-sm text-white/75">
            {["Páginas públicas dos artistas", "Agenda de shows em um só lugar", "Contato para contratação"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px]">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <EfcsysSignature className="text-white/55 hover:text-white" />
      </aside>

      <main className="pt-safe flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <BrandMark className="lg:hidden" compact />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 animate-rise flex-col justify-center py-10">
          <p className="eyebrow text-primary">Entrar</p>
          <h2 className="page-title mt-2">Bem-vindo de volta</h2>
          <p className="mt-2 text-sm text-muted-foreground">Acesse a gestão de artistas e agendas.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-input bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <GoogleIcon />
            Entrar com Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou com e-mail
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <Field label="E-mail">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="voce@email.com"
                  className="h-12 w-full rounded-2xl border border-input bg-background pr-4 pl-11 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
                />
              </div>
            </Field>

            <Field label="Senha">
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-input bg-background pr-12 pl-11 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Aguarde…" : "Entrar"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Ao entrar, você concorda com os{" "}
            <Link to="/termos" className="font-medium text-foreground underline-offset-4 hover:underline">Termos de Serviço</Link>{" "}
            e a{" "}
            <Link to="/privacidade" className="font-medium text-foreground underline-offset-4 hover:underline">Política de Privacidade</Link>.
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
        <span className="text-[0.8125rem] font-semibold text-foreground">{label}</span>
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
