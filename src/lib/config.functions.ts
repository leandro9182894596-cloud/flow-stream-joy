import { createServerFn } from "@tanstack/react-start";

export interface PublicConfig {
  logo: string | null;
  background: string | null;
  banner: string | null;
  bannerLink: string | null;
  dnsList: string[];
}

function normalizeDns(input: string): string {
  let v = input.trim().replace(/\/+$/, "");
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  return v;
}

// Public read — never returns the admin password.
export const getConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_config")
      .select("logo, background, banner, banner_link, dns_list")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      logo: data?.logo ?? null,
      background: data?.background ?? null,
      banner: data?.banner ?? null,
      bannerLink: data?.banner_link ?? null,
      dnsList: Array.isArray(data?.dns_list) ? (data!.dns_list as string[]) : [],
    };
  },
);

// Verify the admin password.
export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("app_config")
      .select("admin_password")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: !!row && row.admin_password === data.password };
  });

interface SavePayload {
  password: string;
  logo?: string | null;
  background?: string | null;
  banner?: string | null;
  bannerLink?: string | null;
  dnsList?: string[];
  newPassword?: string;
}

// Save global settings — requires the current admin password.
export const saveConfig = createServerFn({ method: "POST" })
  .inputValidator((data: SavePayload) => data)
  .handler(async ({ data }): Promise<PublicConfig> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readErr } = await supabaseAdmin
      .from("app_config")
      .select("admin_password")
      .eq("id", 1)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row || row.admin_password !== data.password) {
      throw new Error("Senha de administrador incorreta.");
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.logo !== undefined) update.logo = data.logo;
    if (data.background !== undefined) update.background = data.background;
    if (data.banner !== undefined) update.banner = data.banner;
    if (data.bannerLink !== undefined) update.banner_link = data.bannerLink || null;
    if (data.dnsList !== undefined) {
      update.dns_list = data.dnsList.map(normalizeDns).filter(Boolean).slice(0, 5);
    }
    if (data.newPassword && data.newPassword.trim()) {
      update.admin_password = data.newPassword.trim();
    }

    const { data: updated, error } = await supabaseAdmin
      .from("app_config")
      .update(update)
      .eq("id", 1)
      .select("logo, background, banner, banner_link, dns_list")
      .single();
    if (error) throw new Error(error.message);

    return {
      logo: updated.logo ?? null,
      background: updated.background ?? null,
      banner: updated.banner ?? null,
      bannerLink: updated.banner_link ?? null,
      dnsList: Array.isArray(updated.dns_list) ? (updated.dns_list as string[]) : [],
    };
  });
