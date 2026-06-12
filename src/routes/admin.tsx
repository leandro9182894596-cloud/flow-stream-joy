import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Server,
  Save,
  ArrowLeft,
  Trash2,
  Image as ImageIcon,
  Upload,
  Megaphone,
  Lock,
  Loader2,
  KeyRound,
} from "lucide-react";
import { getConfig, verifyAdmin, saveConfig } from "../lib/config.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — FLOW TV" },
      { name: "description", content: "Configure DNS, logo, plano de fundo e banner de anúncio do FLOW TV." },
    ],
  }),
  component: AdminPage,
});

interface FormState {
  logo?: string;
  background?: string;
  banner?: string;
  bannerLink: string;
  dns: string[]; // always length 5
}

function AdminPage() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const [form, setForm] = useState<FormState>({ bannerLink: "", dns: ["", "", "", "", ""] });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const loadIntoForm = async () => {
    const cfg = await getConfig();
    const dns = [...(cfg.dnsList ?? [])];
    while (dns.length < 5) dns.push("");
    setForm({
      logo: cfg.logo ?? undefined,
      background: cfg.background ?? undefined,
      banner: cfg.banner ?? undefined,
      bannerLink: cfg.bannerLink ?? "",
      dns: dns.slice(0, 5),
    });
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Informe a senha de administrador.");
      return;
    }
    setChecking(true);
    try {
      const { ok } = await verifyAdmin({ data: { password: password.trim() } });
      if (!ok) {
        toast.error("Senha incorreta.");
        return;
      }
      await loadIntoForm();
      setAuthed(true);
    } catch {
      toast.error("Falha ao validar a senha. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveConfig({
        data: {
          password: password.trim(),
          logo: form.logo ?? null,
          background: form.background ?? null,
          banner: form.banner ?? null,
          bannerLink: form.bannerLink,
          dnsList: form.dns,
          newPassword: newPassword.trim() || undefined,
        },
      });
      if (newPassword.trim()) {
        setPassword(newPassword.trim());
        setNewPassword("");
      }
      await qc.invalidateQueries({ queryKey: ["app-config"] });
      toast.success("Configurações salvas", {
        description: "Logo, fundo, banner e DNS atualizados para todos os usuários.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <form
          onSubmit={onLogin}
          className="relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur"
        >
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <ShieldCheck className="h-8 w-8" />
            </span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Área do Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">Digite a senha para continuar.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-input bg-secondary/50 px-3.5 py-3 transition-colors focus-within:border-primary">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="password"
              placeholder="Senha de administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={checking}
            className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
          </button>
          <Link
            to="/login"
            className="focusable flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
          </Link>
        </form>
      </div>
    );
  }

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
            Tudo o que você salvar aqui vale para todos os usuários.
          </p>
        </div>

        {/* DNS list */}
        <div className="space-y-4 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Server className="h-5 w-5 text-primary" /> Servidores (DNS)
          </h2>
          <p className="text-xs text-muted-foreground">
            Cadastre até 5 servidores. Os usuários poderão escolher na tela de login.
          </p>
          {form.dns.map((value, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-input bg-secondary/50 px-3.5 py-3 transition-colors focus-within:border-primary"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="http://servidor.com:8080"
                value={value}
                onChange={(e) => {
                  const dns = [...form.dns];
                  dns[i] = e.target.value;
                  update({ dns });
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* Appearance */}
        <div className="space-y-5 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ImageIcon className="h-5 w-5 text-primary" /> Aparência
          </h2>

          <ImageField
            label="Logo"
            help="Aparece no menu e na tela inicial."
            value={form.logo}
            onChange={(v) => update({ logo: v })}
          />
          <ImageField
            label="Plano de fundo"
            help="Imagem de fundo do aplicativo."
            value={form.background}
            onChange={(v) => update({ background: v })}
          />

          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-primary" /> Banner de anúncio
            </h3>
            <ImageField
              label="Imagem do banner"
              help="Exibido em destaque, bem aparente na tela inicial."
              value={form.banner}
              onChange={(v) => update({ banner: v })}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Link do banner (opcional)</span>
              <input
                type="text"
                inputMode="url"
                placeholder="https://..."
                value={form.bannerLink}
                onChange={(e) => update({ bannerLink: e.target.value })}
                className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Change password */}
        <div className="space-y-3 rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <KeyRound className="h-5 w-5 text-primary" /> Senha do admin
          </h2>
          <input
            type="password"
            placeholder="Nova senha (deixe vazio para manter)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-3 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="focusable flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Salvar tudo</>}
        </button>

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
