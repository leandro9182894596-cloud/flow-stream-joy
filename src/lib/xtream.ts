// FLOW TV — Xtream Codes API client (browser side).
// All JSON calls go through the server proxy at /api/public/xtream to avoid CORS.
// Stream URLs are built locally and played directly by the video player.

export interface Account {
  base: string; // normalized http(s)://host:port
  username: string;
  password: string;
}

export interface UserInfo {
  username: string;
  status: string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string;
  max_connections: string;
}

export type FlowError =
  | "DNS_UNAVAILABLE"
  | "INVALID_USER"
  | "INVALID_PASSWORD"
  | "ACCOUNT_EXPIRED"
  | "CONNECTION_FAILED"
  | "UNKNOWN";

export const ERROR_MESSAGES: Record<FlowError, { title: string; message: string }> = {
  DNS_UNAVAILABLE: {
    title: "Servidor indisponível",
    message: "Não encontramos o servidor (DNS). Verifique o endereço e tente novamente.",
  },
  INVALID_USER: {
    title: "Usuário inválido",
    message: "O usuário informado não existe. Confira os dados e tente de novo.",
  },
  INVALID_PASSWORD: {
    title: "Senha incorreta",
    message: "A senha informada está incorreta. Tente novamente.",
  },
  ACCOUNT_EXPIRED: {
    title: "Conta vencida",
    message: "Sua assinatura expirou. Renove com seu provedor para continuar assistindo.",
  },
  CONNECTION_FAILED: {
    title: "Falha de conexão",
    message: "Sem conexão com a internet ou o servidor não respondeu. Tente novamente.",
  },
  UNKNOWN: {
    title: "Algo deu errado",
    message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
  },
};

export class FlowApiError extends Error {
  code: FlowError;
  constructor(code: FlowError) {
    super(ERROR_MESSAGES[code].message);
    this.code = code;
  }
}

export function normalizeBase(input: string): string {
  let v = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  return v;
}

async function apiCall<T>(account: Account, params: Record<string, string>): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/public/xtream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base: account.base,
        path: "player_api.php",
        params: {
          username: account.username,
          password: account.password,
          ...params,
        },
      }),
    });
  } catch {
    throw new FlowApiError("CONNECTION_FAILED");
  }

  if (!res.ok) {
    let code: FlowError = "CONNECTION_FAILED";
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error === "DNS_UNAVAILABLE") code = "DNS_UNAVAILABLE";
      else if (err.error === "INVALID_INPUT") code = "DNS_UNAVAILABLE";
    } catch {
      /* ignore */
    }
    throw new FlowApiError(code);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new FlowApiError("UNKNOWN");
  }

  // The proxy now returns HTTP 200 with an error payload for upstream/network
  // failures (avoids platform 5xx blank-screen). Detect and map those here.
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = payload as { error?: string };
    let code: FlowError = "CONNECTION_FAILED";
    if (err.error === "DNS_UNAVAILABLE" || err.error === "INVALID_INPUT") code = "DNS_UNAVAILABLE";
    else if (err.error === "UPSTREAM_ERROR") code = "CONNECTION_FAILED";
    throw new FlowApiError(code);
  }

  return payload as T;
}

export async function authenticate(account: Account): Promise<UserInfo> {
  const data = await apiCall<{ user_info?: UserInfo & { auth?: number } }>(account, {});
  const info = data.user_info;
  if (!info || info.auth === 0) {
    // Xtream returns auth:0 for bad credentials; we can't distinguish user vs pass reliably.
    throw new FlowApiError("INVALID_USER");
  }
  if (info.status && info.status.toLowerCase() !== "active") {
    throw new FlowApiError("ACCOUNT_EXPIRED");
  }
  // Expiry check
  if (info.exp_date) {
    const exp = Number(info.exp_date) * 1000;
    if (!Number.isNaN(exp) && exp < Date.now()) {
      throw new FlowApiError("ACCOUNT_EXPIRED");
    }
  }
  return info;
}

export async function authenticateWithDnsFallback(
  bases: string[],
  credentials: Pick<Account, "username" | "password">,
): Promise<{ account: Account; info: UserInfo }> {
  const normalizedBases = Array.from(
    new Set(
      bases
        .map(normalizeBase)
        .filter(Boolean),
    ),
  );

  if (normalizedBases.length === 0) {
    throw new FlowApiError("DNS_UNAVAILABLE");
  }

  let preferredError: FlowApiError | null = null;
  let fallbackError: FlowApiError | null = null;

  for (const base of normalizedBases) {
    const account: Account = {
      base,
      username: credentials.username.trim(),
      password: credentials.password.trim(),
    };

    try {
      const info = await authenticate(account);
      return { account, info };
    } catch (error) {
      if (!(error instanceof FlowApiError)) {
        fallbackError = new FlowApiError("UNKNOWN");
        continue;
      }

      if (error.code === "ACCOUNT_EXPIRED" || error.code === "INVALID_USER" || error.code === "INVALID_PASSWORD") {
        preferredError = error;
      } else if (!fallbackError) {
        fallbackError = error;
      }
    }
  }

  throw preferredError ?? fallbackError ?? new FlowApiError("UNKNOWN");
}

// ---------- Content types ----------
export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface LiveStream {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
  epg_channel_id?: string;
  num?: number;
}

export interface VodStream {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
  rating?: string;
  added?: string;
  container_extension?: string;
}

export interface SeriesItem {
  series_id: number;
  name: string;
  cover: string;
  cover_big?: string;
  movie_image?: string;
  stream_icon?: string;
  poster_path?: string;
  image?: string;
  category_id: string;
  rating?: string;
  plot?: string;
  releaseDate?: string;
}

export interface SeriesEpisode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: { duration_secs?: number; movie_image?: string; plot?: string };
  season?: number;
}

export interface SeriesInfo {
  info: { name?: string; cover?: string; plot?: string; genre?: string; rating?: string; releaseDate?: string };
  seasons: { season_number: number; name?: string }[];
  episodes: Record<string, SeriesEpisode[]>;
}

export interface VodInfo {
  info: {
    movie_image?: string;
    plot?: string;
    genre?: string;
    rating?: string;
    duration?: string;
    releasedate?: string;
    cast?: string;
    director?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
  };
  movie_data: { stream_id: number; name: string; container_extension: string };
}

// ---------- Content fetchers ----------
export const getLiveCategories = (a: Account) =>
  apiCall<Category[]>(a, { action: "get_live_categories" });
export const getVodCategories = (a: Account) =>
  apiCall<Category[]>(a, { action: "get_vod_categories" });
export const getSeriesCategories = (a: Account) =>
  apiCall<Category[]>(a, { action: "get_series_categories" });

export const getLiveStreams = async (a: Account, categoryId?: string) =>
  normalizeLiveStreams(
    await apiCall<LiveStream[]>(a, {
      action: "get_live_streams",
      ...(categoryId ? { category_id: categoryId } : {}),
    }),
    a.base,
  );
export const getVodStreams = async (a: Account, categoryId?: string) =>
  normalizeVodStreams(
    await apiCall<VodStream[]>(a, {
      action: "get_vod_streams",
      ...(categoryId ? { category_id: categoryId } : {}),
    }),
    a.base,
  );
export const getSeries = async (a: Account, categoryId?: string) =>
  normalizeSeriesList(
    await apiCall<SeriesItem[]>(a, {
      action: "get_series",
      ...(categoryId ? { category_id: categoryId } : {}),
    }),
    a.base,
  );

export const getVodInfo = async (a: Account, vodId: number) =>
  normalizeVodInfo(await apiCall<VodInfo>(a, { action: "get_vod_info", vod_id: String(vodId) }), a.base);
export const getSeriesInfo = async (a: Account, seriesId: number) =>
  normalizeSeriesInfo(await apiCall<SeriesInfo>(a, { action: "get_series_info", series_id: String(seriesId) }), a.base);

function normalizeMediaUrl(url: string | undefined, base: string): string {
  const raw = (url ?? "").trim().replace(/\\\//g, "/");
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) {
    try {
      return `${new URL(base).protocol}${raw}`;
    } catch {
      return `https:${raw}`;
    }
  }
  try {
    return new URL(raw, `${base.replace(/\/+$/, "")}/`).toString();
  } catch {
    return raw;
  }
}

function normalizeLiveStreams(list: LiveStream[], base: string): LiveStream[] {
  return Array.isArray(list) ? list.map((item) => ({ ...item, stream_icon: normalizeMediaUrl(item.stream_icon, base) })) : [];
}

function normalizeVodStreams(list: VodStream[], base: string): VodStream[] {
  return Array.isArray(list) ? list.map((item) => ({ ...item, stream_icon: normalizeMediaUrl(item.stream_icon, base) })) : [];
}

function normalizeSeriesList(list: SeriesItem[], base: string): SeriesItem[] {
  return Array.isArray(list)
    ? list.map((item) => {
        const cover = item.cover || item.cover_big || item.movie_image || item.stream_icon || item.poster_path || item.image;
        return { ...item, cover: normalizeMediaUrl(cover, base) };
      })
    : [];
}

function normalizeVodInfo(data: VodInfo, base: string): VodInfo {
  return {
    ...data,
    info: {
      ...data.info,
      movie_image: normalizeMediaUrl(data.info?.movie_image, base),
      backdrop_path: data.info?.backdrop_path?.map((url) => normalizeMediaUrl(url, base)),
    },
  };
}

function normalizeSeriesInfo(data: SeriesInfo, base: string): SeriesInfo {
  const episodes = Object.fromEntries(
    Object.entries(data.episodes ?? {}).map(([season, eps]) => [
      season,
      eps.map((ep) => ({
        ...ep,
        info: ep.info ? { ...ep.info, movie_image: normalizeMediaUrl(ep.info.movie_image, base) } : ep.info,
      })),
    ]),
  );
  return {
    ...data,
    info: { ...data.info, cover: normalizeMediaUrl(data.info?.cover, base) },
    episodes,
  };
}

// ---------- Stream URL builders ----------
// The app runs on HTTPS but Xtream streams are usually plain HTTP. Browsers
// block mixed content, so we route every stream through the HTTPS media proxy.
// For HLS (.m3u8) the proxy rewrites child URLs too; we keep the .m3u8 suffix
// in the proxied URL so the player still detects HLS.
// Cover/poster images from Xtream panels are usually plain HTTP. The app runs
// on HTTPS, so the browser blocks them as mixed content and the images never
// appear. Route HTTP images through the HTTPS media proxy so they always load.
export function proxiedImage(url?: string): string | undefined {
  return imageCandidates(url)[0];
}

export function imageCandidates(url?: string): string[] {
  if (!url) return [];
  const u = url.trim();
  if (!u) return [];
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("/api/public/stream")) return [u];
  // Keep SSR and browser markup equal, and route remote covers through our HTTPS proxy.
  if (/^https:\/\//i.test(u)) return [`/api/public/stream?url=${encodeURIComponent(u)}&kind=image`, u];
  if (/^http:\/\//i.test(u)) return [`/api/public/stream?url=${encodeURIComponent(u)}&kind=image`];
  return [u];
}

function proxiedUrl(absoluteUrl: string): string {
  if (typeof window === "undefined") return absoluteUrl;
  const hls = /\.m3u8($|\?)/i.test(absoluteUrl) ? "&ext=.m3u8" : "";
  return `/api/public/stream?url=${encodeURIComponent(absoluteUrl)}${hls}`;
}

export function liveStreamUrl(a: Account, streamId: number): string {
  return proxiedUrl(
    `${a.base}/live/${encodeURIComponent(a.username)}/${encodeURIComponent(a.password)}/${streamId}.m3u8`,
  );
}
export function vodStreamUrl(a: Account, streamId: number, ext = "mp4"): string {
  return proxiedUrl(
    `${a.base}/movie/${encodeURIComponent(a.username)}/${encodeURIComponent(a.password)}/${streamId}.${ext}`,
  );
}
export function seriesStreamUrl(a: Account, episodeId: string, ext = "mp4"): string {
  return proxiedUrl(
    `${a.base}/series/${encodeURIComponent(a.username)}/${encodeURIComponent(a.password)}/${episodeId}.${ext}`,
  );
}
