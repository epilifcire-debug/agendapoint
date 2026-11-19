import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminAccounts, inviteAdminAccount, setAdminAccountActive, deleteAdminAccount } from "@/lib/adminAccounts.functions";

export function AdminAccounts() {
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; email: string } | null>(null);
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAccounts);
  const inviteFn = useServerFn(inviteAdminAccount);
  const activeFn = useServerFn(setAdminAccountActive);
  const deleteFn = useServerFn(deleteAdminAccount);
  const accounts = useQuery({ queryKey: ["admin-accounts"], queryFn: () => listFn() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-accounts"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };
  const invite = useMutation({ mutationFn: () => inviteFn({ data: { email } }), onSuccess: () => { toast.success("Convite enviado."); setEmail(""); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const toggle = useMutation({ mutationFn: (item: { id: string; active: boolean }) => activeFn({ data: item }), onSuccess: () => { toast.success("Acesso atualizado."); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: () => { toast.success("Conta excluída. Artistas transferidos ao Master."); setDeleting(null); refresh(); }, onError: (e: Error) => toast.error(e.message) });

  return <section className="panel grid gap-5 p-5">
    <div><h2 className="font-medium">Administradores</h2><p className="text-sm text-ink-soft">Quem pode gerenciar artistas. Só o Administrador Master vê esta seção.</p></div>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); invite.mutate(); }}>
      <label className="min-w-48 flex-1 text-sm font-medium" htmlFor="admin-email">E-mail do novo administrador
        <Input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" className="mt-1" />
      </label>
      <Button type="submit" disabled={invite.isPending} className="self-end"><UserPlus /> {invite.isPending ? "Enviando…" : "Convidar administrador"}</Button>
    </form>
    {accounts.isLoading && <p className="text-sm text-ink-soft">Carregando administradores…</p>}
    {accounts.isError && <p role="alert" className="text-sm text-pink-ink">Não foi possível carregar os administradores. Tente novamente.</p>}
    {accounts.data?.length === 0 && <p className="text-sm text-ink-soft">Nenhum administrador cadastrado.</p>}
    <ul className="divide-y divide-line">
      {accounts.data?.map((account) => <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0"><div className="break-all font-medium">{account.email}</div><span className={`pi-status ${account.active ? "pi-status--published" : "pi-status--cancelled"}`}>{account.active ? "Ativo" : "Bloqueado"}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={toggle.isPending || remove.isPending} onClick={() => toggle.mutate({ id: account.id, active: !account.active })}>{account.active ? <ShieldOff /> : <ShieldCheck />}{account.active ? "Bloquear" : "Ativar"}</Button>
          <Button size="sm" variant="outline" disabled={toggle.isPending || remove.isPending} onClick={() => setDeleting({ id: account.id, email: account.email })} aria-label={`Excluir ${account.email}`}><Trash2 /> Excluir conta</Button>
        </div>
      </li>)}
    </ul>
    {deleting && <div role="dialog" aria-modal="true" aria-labelledby="delete-admin-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[#110a22]/50 p-4" onKeyDown={(e) => { if (e.key === "Escape") setDeleting(null); }}>
      <div className="w-full max-w-md rounded-[10px] border border-line bg-sheet p-6">
        <h3 id="delete-admin-title" className="section-title">Excluir a conta {deleting.email}?</h3>
        <p className="mt-2 text-sm text-ink-soft">A conta {deleting.email} será excluída. Todos os artistas vinculados passarão ao Master. Essa ação não pode ser desfeita.</p>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" autoFocus disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>{remove.isPending ? "Excluindo…" : "Excluir conta"}</Button></div>
      </div>
    </div>}
  </section>;
}