import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Server, Save, ArrowLeft, Trash2, Image as ImageIcon, Upload, Megaphone } from "lucide-react";
import { loadDns, saveDns, clearDns, loadSettings, saveSettings, type AppSettings } from "../lib/storage";
import { normalizeBase } from "../lib/xtream";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — FLOW TV" },
      { name: "description", content: "Configure DNS, logo, plano de fundo e banner de anúncio do FLOW TV." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [dns, setDns] = useState("");
  const [settings, setSettings] = useState<AppSettings>({});

  useEffect(() => {
    setDns(loadDns() ?? "");
    setSettings(loadSettings());
  }, []);

  const onSaveDns = (e: React.FormEvent) => {
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

  const onClearDns = () => {
    clearDns();
    setDns("");
    toast.success("DNS removida.");
  };

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const onSaveAppearance = () => {
    saveSettings(settings);
    toast.success("Aparência salva", { description: "Logo, fundo e banner atualizados." });
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre a DNS e personalize a aparência do aplicativo.
          </p>
        </div>

        {/* DNS */}
        <form
          onSubmit={onSaveDns}
          className="space-y-4 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Server className="h-5 w-5 text-primary" /> Servidor (DNS)
          </h2>
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
          <button
            type="submit"
            className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
          >
            <Save className="h-5 w-5" /> Salvar DNS
          </button>
          {dns && (
            <button
              type="button"
              onClick={onClearDns}
              className="focusable flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" /> Remover DNS
            </button>
          )}
        </form>

        {/* Appearance */}
        <div className="space-y-5 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ImageIcon className="h-5 w-5 text-primary" /> Aparência
          </h2>

          <ImageField
            label="Logo"
            help="Aparece no menu e na tela inicial."
            value={settings.logo}
            onChange={(v) => update({ logo: v })}
          />
          <ImageField
            label="Plano de fundo"
            help="Imagem de fundo do aplicativo."
            value={settings.background}
            onChange={(v) => update({ background: v })}
          />

          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-primary" /> Banner de anúncio
            </h3>
            <ImageField
              label="Imagem do banner"
              help="Mostrado em destaque na tela inicial."
              value={settings.banner}
              onChange={(v) => update({ banner: v })}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Link do banner (opcional)</span>
              <input
                type="text"
                inputMode="url"
                placeholder="https://..."
                value={settings.bannerLink ?? ""}
                onChange={(e) => update({ bannerLink: e.target.value })}
                className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onSaveAppearance}
            className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
          >
            <Save className="h-5 w-5" /> Salvar aparência
          </button>
        </div>

        <Link
          to="/login"
          className="focusable flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
        </Link>
      </div>
    </div>
  );
}

function ImageField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Escolha um arquivo de até 3 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div>
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        {help && <span className="block text-[11px] text-muted-foreground/70">{help}</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/50">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="text"
            placeholder="Cole uma URL ou envie um arquivo"
            value={value && !value.startsWith("data:") ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="focusable flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50"
            >
              <Upload className="h-3.5 w-3.5" /> Enviar
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="focusable flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
