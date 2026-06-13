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

  try {
    return (await res.json()) as T;
  } catch {
    throw new FlowApiError("UNKNOWN");
  }
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

export const getLiveStreams = (a: Account, categoryId?: string) =>
  apiCall<LiveStream[]>(a, {
    action: "get_live_streams",
    ...(categoryId ? { category_id: categoryId } : {}),
  });
export const getVodStreams = (a: Account, categoryId?: string) =>
  apiCall<VodStream[]>(a, {
    action: "get_vod_streams",
    ...(categoryId ? { category_id: categoryId } : {}),
  });
export const getSeries = (a: Account, categoryId?: string) =>
  apiCall<SeriesItem[]>(a, {
    action: "get_series",
    ...(categoryId ? { category_id: categoryId } : {}),
  });

export const getVodInfo = (a: Account, vodId: number) =>
  apiCall<VodInfo>(a, { action: "get_vod_info", vod_id: String(vodId) });
export const getSeriesInfo = (a: Account, seriesId: number) =>
  apiCall<SeriesInfo>(a, { action: "get_series_info", series_id: String(seriesId) });

// ---------- Stream URL builders ----------
// The app runs on HTTPS but Xtream streams are usually plain HTTP. Browsers
// block mixed content, so we route every stream through the HTTPS media proxy.
// For HLS (.m3u8) the proxy rewrites child URLs too; we keep the .m3u8 suffix
// in the proxied URL so the player still detects HLS.
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
