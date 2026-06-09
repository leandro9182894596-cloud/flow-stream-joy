import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MonitorPlay, Loader2, User, Lock, Eye, EyeOff, Settings } from "lucide-react";
import { authenticate, normalizeBase, FlowApiError, ERROR_MESSAGES } from "../lib/xtream";
import { useAccount } from "../hooks/use-account";
import { loadDns } from "../lib/storage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — FLOW TV" },
      { name: "description", content: "Acesse sua lista IPTV no FLOW TV com usuário e senha." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, account, ready } = useAccount();
  const [dns, setDns] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDns(loadDns());
  }, []);

  useEffect(() => {
    if (ready && account) navigate({ to: "/" });
  }, [ready, account, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const server = loadDns();
    if (!server) {
      toast.error("Servidor não configurado", {
        description: "Peça ao administrador para cadastrar a DNS na página de Admin.",
      });
      return;
    }
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha.");
      return;
    }
    setLoading(true);
    const acc = { base: normalizeBase(server), username: username.trim(), password: password.trim() };
    try {
      const info = await authenticate(acc);
      login(acc, info);
      toast.success(`Bem-vindo, ${info.username}!`);
      navigate({ to: "/" });
    } catch (err) {
      const code = err instanceof FlowApiError ? err.code : "UNKNOWN";
      const m = ERROR_MESSAGES[code];
      toast.error(m.title, { description: m.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <MonitorPlay className="h-8 w-8" />
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            FLOW<span className="text-gradient">TV</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Seu universo IPTV em qualquer tela</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur"
        >
          {!dns && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-xs text-destructive">
              Nenhuma DNS configurada. Acesse a página de Admin para cadastrar o servidor.
            </p>
          )}


          <Field icon={User} label="Usuário">
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="seu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </Field>

          <Field icon={Lock} label="Senha">
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="focusable text-muted-foreground hover:text-foreground"
              aria-label="Mostrar senha"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Seus dados ficam salvos apenas neste dispositivo.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Server;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-input bg-secondary/50 px-3.5 py-3 transition-colors focus-within:border-primary">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}
