import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LayoutDashboard, LogOut, SlidersHorizontal, UserCircle, Users, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { BrandMark, EfcsysSignature, ThemeToggle } from "@/components/brand";
import { InstallAppButton } from "@/components/PwaRegister";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

type NavItem = { to: string; label: string; short: string; icon: LucideIcon; adminOnly?: boolean; artistOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel", short: "Painel", icon: LayoutDashboard },
  { to: "/artistas", label: "Artistas", short: "Artistas", icon: Users, adminOnly: true },
  { to: "/agenda", label: "Agenda", short: "Agenda", icon: CalendarDays, adminOnly: true },
  { to: "/profile", label: "Perfil", short: "Perfil", icon: UserCircle, artistOnly: true },
  { to: "/settings", label: "Configurações", short: "Ajustes", icon: SlidersHorizontal },
];

function AuthenticatedLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = Route.useRouteContext();
  const adminFn = useServerFn(amIAdmin);
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  const isAdmin = admin.data?.isAdmin === true;
  const items = NAV.filter((item) => (item.adminOnly ? isAdmin : item.artistOnly ? !isAdmin && !admin.isLoading : true));
  const role = admin.data?.isMaster ? "Administrador Master" : isAdmin ? "Administrador" : "Artista";
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "Conta";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-sheet px-3 py-5 lg:flex">
        <BrandMark to="/dashboard" className="px-2 pb-5" />
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-violet/10 text-violet" : "text-ink-soft hover:bg-paper hover:text-ink",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-3 border-t border-line px-2 pt-3">
          <InstallAppButton />
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-paper">{name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-ink-soft">{admin.isLoading ? "…" : role}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={handleSignOut} className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm text-ink-soft hover:bg-paper hover:text-ink">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} /> Sair
            </button>
            <ThemeToggle />
          </div>
          <EfcsysSignature />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="pt-safe sticky top-0 z-30 border-b border-line bg-sheet lg:hidden">
          <div className="flex h-15 items-center justify-between py-2.5 pr-2 pl-4">
            <BrandMark to="/dashboard" />
            <div className="flex items-center">
              <ThemeToggle />
              <button onClick={handleSignOut} aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink">
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sheet lg:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => {
            const active = isActive(item.to);
            return (
              <li key={item.to}>
                <Link to={item.to} aria-current={active ? "page" : undefined} className={cn("flex h-15 flex-col items-center justify-center gap-1 py-2 text-xs font-medium", active ? "text-violet" : "text-ink-soft")}>
                  <item.icon className="h-5 w-5" strokeWidth={1.75} />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
