import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/definir-senha")({
  component: SetPasswordPage,
  head: () => ({ meta: [
    { title: "Definir senha — Agenda Point do Ingresso" },
    { name: "description", content: "Defina sua senha para acessar a Agenda Point do Ingresso." },
    { property: "og:title", content: "Definir senha — Agenda Point do Ingresso" },
    { property: "og:description", content: "Ative seu acesso à Agenda Point do Ingresso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    // The invitation callback establishes the auth session before a password can be saved.
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setValid(Boolean(data.session)); setReady(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) { setValid(true); setReady(true); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError("Não foi possível definir a senha. Solicite um novo convite ao Master."); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  return <main className="flex min-h-dvh items-center justify-center bg-background px-5">
    <div className="w-full max-w-sm space-y-6">
      <BrandMark />
      <div><h1 className="page-title mt-2">Definir senha</h1></div>
      {!ready ? <p className="text-ink-soft">Validando convite…</p> : !valid ? <p className="text-ink-soft">Este convite expirou ou não é válido. Solicite um novo convite ao Master. <Link to="/login" className="text-violet underline">Voltar para entrar</Link></p> :
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-foreground">Nova senha<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-2 h-11 w-full rounded-md border border-line bg-sheet px-3 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20" /></label>
          <label className="block text-sm font-medium text-foreground">Confirmar senha<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="mt-2 h-11 w-full rounded-md border border-line bg-sheet px-3 text-base outline-none focus:border-violet focus:ring-3 focus:ring-violet/20" /></label>
          {error && <p role="alert" className="text-sm text-pink-ink">{error}</p>}
          <Button type="submit" size="lg" disabled={saving} className="w-full">{saving ? "Salvando…" : "Salvar senha"}</Button>
        </form>}
    </div>
  </main>;
}