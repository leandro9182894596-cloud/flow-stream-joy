import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Server, Save, ArrowLeft, Trash2 } from "lucide-react";
import { loadDns, saveDns, clearDns } from "../lib/storage";
import { normalizeBase } from "../lib/xtream";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — FLOW TV" },
      { name: "description", content: "Cadastre a DNS do servidor IPTV usada no login do FLOW TV." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [dns, setDns] = useState("");

  useEffect(() => {
    setDns(loadDns() ?? "");
  }, []);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dns.trim()) {
      toast.error("Informe a DNS do servidor.");
      return;
    }
    const normalized = normalizeBase(dns);
    saveDns(normalized);
    setDns(normalized);
    toast.success("DNS salva", { description: "Os usuários agora se conectam a este servidor." });
  };

  const onClear = () => {
    clearDns();
    setDns("");
    toast.success("DNS removida.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre a DNS do servidor. Os usuários só informam usuário e senha.
          </p>
        </div>

        <form
          onSubmit={onSave}
          className="space-y-4 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Servidor (DNS)
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-input bg-secondary/50 px-3.5 py-3 transition-colors focus-within:border-primary">
              <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="http://seuservidor.com:8080"
                value={dns}
                onChange={(e) => setDns(e.target.value)}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          </label>

          <button
            type="submit"
            className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
          >
            <Save className="h-5 w-5" /> Salvar DNS
          </button>

          {dns && (
            <button
              type="button"
              onClick={onClear}
              className="focusable flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" /> Remover DNS
            </button>
          )}

          <Link
            to="/login"
            className="focusable flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
          </Link>
        </form>
      </div>
    </div>
  );
}
