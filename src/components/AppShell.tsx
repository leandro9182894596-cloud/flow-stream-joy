import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Tv, Film, MonitorPlay, Clapperboard, LogOut, Search, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "../hooks/use-account";
import { useSettings } from "../hooks/use-settings";

const NAV: { to: string; label: string; icon: typeof Tv; exact?: boolean }[] = [
  { to: "/", label: "Início", icon: MonitorPlay, exact: true },
  { to: "/live", label: "TV ao Vivo", icon: Tv },
  { to: "/movies", label: "Filmes", icon: Film },
  { to: "/series", label: "Séries", icon: Clapperboard },
  { to: "/favorites", label: "Favoritos", icon: Heart },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { userInfo, logout } = useAccount();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSettings();
  // Avoid SSR/client hydration mismatch (React #418 → white screen on TV):
  // settings come from localStorage which the server can't see, so only apply
  // appearance after the component has mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasBg = mounted && !!settings.background;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className={`relative flex min-h-screen ${hasBg ? "bg-black" : "bg-background"}`}>
      {hasBg && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <img src={settings.background} alt="" className="h-full w-full object-cover" />
          {/* Dark scrim keeps the background visible but text readable on all devices */}
          <div className="absolute inset-0 bg-background/85" />
        </div>
      )}
      <div className="relative z-10 flex min-h-screen w-full">
      {/* Sidebar (desktop) */}
      <aside className={`sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border p-4 lg:flex ${hasBg ? "bg-sidebar/70 backdrop-blur" : "bg-sidebar"}`}>
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`focusable flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          {userInfo && (
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 text-xs">
              <p className="font-semibold text-sidebar-foreground">{userInfo.username}</p>
              <p className="text-muted-foreground">
                {userInfo.exp_date
                  ? `Vence ${new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString("pt-BR")}`
                  : "Conta ativa"}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="focusable flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <Link
            to="/search"
            className="focusable ml-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar canais, filmes e séries…</span>
            <span className="sm:hidden">Buscar</span>
          </Link>
          <button
            onClick={handleLogout}
            className="focusable flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive lg:hidden"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`focusable flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const settings = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Link to="/" className="focusable flex items-center gap-2.5">
      {mounted && settings.logo ? (
        <img
          src={settings.logo}
          alt="Logo"
          className={`${compact ? "h-8" : "h-9"} w-auto max-w-[160px] object-contain`}
        />
      ) : (
        <>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <span
            className={`font-display ${compact ? "text-lg" : "text-xl"} font-extrabold tracking-tight`}
          >
            FLOW<span className="text-gradient">TV</span>
          </span>
        </>
      )}
    </Link>
  );
}
