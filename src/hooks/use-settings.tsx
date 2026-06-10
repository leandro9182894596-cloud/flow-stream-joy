import { useEffect, useState } from "react";
import { loadSettings, SETTINGS_EVENT, type AppSettings } from "../lib/storage";

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>({});

  useEffect(() => {
    const sync = () => setSettings(loadSettings());
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return settings;
}
