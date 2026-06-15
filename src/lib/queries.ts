import { useQuery } from "@tanstack/react-query";
import { getCache, setCache } from "./storage";
import type { Account } from "./xtream";

const HOUR = 60 * 60 * 1000;
const CONTENT_CACHE_VERSION = "covers-v3";

/**
 * react-query + localStorage cache combo for instant loads and offline resilience.
 * Reads localStorage synchronously for initialData, refreshes in background.
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { enabled?: boolean; maxAgeMs?: number },
) {
  const maxAge = opts?.maxAgeMs ?? 6 * HOUR;
  return useQuery<T>({
    queryKey: [key],
    enabled: opts?.enabled ?? true,
    initialData: () => getCache<T>(key, maxAge) ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * HOUR,
    queryFn: async () => {
      const data = await fetcher();
      setCache(key, data);
      return data;
    },
  });
}

export function accountKey(a: Account | null): string {
  if (!a) return "anon";
  return `${a.base}|${a.username}|${CONTENT_CACHE_VERSION}`;
}
