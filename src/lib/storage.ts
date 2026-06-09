// FLOW TV — local persistence: account, cache, continue-watching, favorites.

import type { Account, UserInfo } from "./xtream";

const ACCOUNT_KEY = "flowtv.account";
const USERINFO_KEY = "flowtv.userinfo";
const PROGRESS_KEY = "flowtv.progress";
const FAV_KEY = "flowtv.favorites";
const CACHE_PREFIX = "flowtv.cache.";

const isBrowser = typeof window !== "undefined";

// ---------- Account ----------
export function loadAccount(): Account | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}
export function saveAccount(account: Account, info?: UserInfo) {
  if (!isBrowser) return;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  if (info) localStorage.setItem(USERINFO_KEY, JSON.stringify(info));
}
export function loadUserInfo(): UserInfo | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(USERINFO_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}
export function clearAccount() {
  if (!isBrowser) return;
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(USERINFO_KEY);
  // clear caches too
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

// ---------- Cache (TTL) ----------
export function getCache<T>(key: string, maxAgeMs: number): T | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}
export function setCache<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // storage full — drop oldest cache entries
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .slice(0, 10)
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

// ---------- Continue watching ----------
export interface ProgressEntry {
  key: string; // unique id e.g. "movie:123" or "ep:456"
  type: "movie" | "series";
  refId: number; // movie stream_id OR series_id
  episodeId?: string;
  title: string;
  poster: string;
  position: number; // seconds
  duration: number; // seconds
  updatedAt: number;
  // playback hint for resume
  ext?: string;
  seriesId?: number;
}

export function loadProgress(): ProgressEntry[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const list = raw ? (JSON.parse(raw) as ProgressEntry[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}
export function getProgress(key: string): ProgressEntry | undefined {
  return loadProgress().find((p) => p.key === key);
}
export function saveProgress(entry: ProgressEntry) {
  if (!isBrowser) return;
  const list = loadProgress().filter((p) => p.key !== entry.key);
  // Drop entries that are essentially finished (>95%)
  if (entry.duration > 0 && entry.position / entry.duration < 0.95) {
    list.unshift(entry);
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(list.slice(0, 40)));
}
export function removeProgress(key: string) {
  if (!isBrowser) return;
  const list = loadProgress().filter((p) => p.key !== key);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(list));
}

// ---------- Favorites ----------
export type FavType = "live" | "movie" | "series";
export interface Favorite {
  id: string; // `${type}:${refId}`
  type: FavType;
  refId: number;
  title: string;
  poster: string;
}
export function loadFavorites(): Favorite[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}
export function isFavorite(id: string): boolean {
  return loadFavorites().some((f) => f.id === id);
}
export function toggleFavorite(fav: Favorite): boolean {
  if (!isBrowser) return false;
  const list = loadFavorites();
  const exists = list.some((f) => f.id === fav.id);
  const next = exists ? list.filter((f) => f.id !== fav.id) : [fav, ...list];
  localStorage.setItem(FAV_KEY, JSON.stringify(next.slice(0, 200)));
  return !exists;
}
