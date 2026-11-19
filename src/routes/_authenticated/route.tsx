import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LayoutDashboard, LogOut, Settings, UserCircle, Users, type LucideIcon } from "lucide-react";
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

type NavItem = { to: string; label: string; short: string; icon: LucideIcon; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel", short: "Painel", icon: LayoutDashboard },
  { to: "/artistas", label: "Artistas", short: "Artistas", icon: Users, adminOnly: true },
  { to: "/agenda", label: "Agenda dos artistas", short: "Agenda", icon: CalendarDays, adminOnly: true },
  { to: "/profile", label: "Perfil", short: "Perfil", icon: UserCircle },
  { to: "/settings", label: "Configurações", short: "Ajustes", icon: Settings },
];

function AuthenticatedLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = Route.useRouteContext();
  const adminFn = useServerFn(amIAdmin);
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => adminFn() });
  const isAdmin = admin.data?.isAdmin === true;
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);
  const role = admin.data?.isMaster ? "Administrador Master" : isAdmin ? "Administrador" : "Conta";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface/70 px-4 py-6 lg:flex">
        <BrandMark to="/dashboard" className="px-2" />
        <nav aria-label="Navegação principal" className="mt-10 flex flex-1 flex-col gap-1">
          <p className="eyebrow mb-2 px-3">Gestão</p>
          {items.map((item) => (
            <SideLink key={item.to} item={item} active={isActive(item.to)} />
          ))}
        </nav>
        <div className="space-y-3">
          <InstallAppButton className="w-full justify-center" />
          <div className="panel flex items-center gap-3 p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient font-display text-sm font-semibold text-white">
              {(user.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.isLoading ? "…" : role}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" /> Sair
            </button>
            <ThemeToggle />
          </div>
          <div className="px-2 pt-1"><EfcsysSignature /></div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Topo — mobile */}
        <header className="pt-safe sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <BrandMark to="/dashboard" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={handleSignOut} aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14">
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior — mobile */}
      <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => {
            const active = isActive(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors", active ? "text-primary" : "text-muted-foreground")}
                >
                  <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active && "bg-primary/12")}>
                    <item.icon className="h-5 w-5" />
                  </span>
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

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && <span aria-hidden className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-primary" />}
      <item.icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "")} />
      {item.label}
    </Link>
  );
}
