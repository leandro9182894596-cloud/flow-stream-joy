import { useQuery } from "@tanstack/react-query";
import { loadSettings, saveSettings, type AppSettings } from "../lib/storage";
import { getConfig } from "../lib/config.functions";

/**
 * Global app appearance settings (logo, background, banner, DNS list).
 * Stored server-side so every user sees the same branding configured by the
 * admin. localStorage is used only as an instant-render cache.
 */
export function useSettings(): AppSettings {
  const { data } = useQuery<AppSettings>({
    queryKey: ["app-config"],
    initialData: () => loadSettings(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 15 * 1000,
    queryFn: async () => {
      const cfg = await getConfig();
      const next: AppSettings = {
        logo: cfg.logo ?? undefined,
        background: cfg.background ?? undefined,
        banner: cfg.banner ?? undefined,
        bannerLink: cfg.bannerLink ?? undefined,
        dnsList: cfg.dnsList,
      };
      saveSettings(next);
      return next;
    },
  });

  return data ?? {};
}
