import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Play, ArrowLeft, Star, Clock, Heart } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { VideoPlayer } from "../components/VideoPlayer";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getVodInfo, vodStreamUrl, proxiedImage } from "../lib/xtream";
import { getProgress, saveProgress, toggleFavorite, isFavorite } from "../lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/movie/$id")({
  head: () => ({
    meta: [
      { title: "Filme — FLOW TV" },
      { name: "description", content: "Detalhes e reprodução do filme no FLOW TV." },
    ],
  }),
  component: MoviePage,
});

function MoviePage() {
  const { id } = useParams({ from: "/movie/$id" });
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const streamId = Number(id);

  const info = useCachedQuery(`${key}:vodinfo:${id}`, () => getVodInfo(account!, streamId), {
    enabled: !!account,
    maxAgeMs: 24 * 60 * 60 * 1000,
  });

  const [playing, setPlaying] = useState(false);
  const [fav, setFav] = useState(false);
  const progressKey = `movie:${streamId}`;
  const resume = getProgress(progressKey);
  const lastSave = useRef(0);

  useEffect(() => {
    setFav(isFavorite(`movie:${streamId}`));
  }, [streamId]);

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = info.data;
  const ext = data?.movie_data?.container_extension || "mp4";
  const title = data?.movie_data?.name || "Filme";
  const poster = proxiedImage(data?.info?.movie_image);
  const backdrop = proxiedImage(data?.info?.backdrop_path?.[0]) || poster;

  const handleProgress = (pos: number, dur: number) => {
    const now = Date.now();
    if (now - lastSave.current < 5000) return;
    lastSave.current = now;
    saveProgress({
      key: progressKey,
      type: "movie",
      refId: streamId,
      title,
      poster: poster || "",
      position: pos,
      duration: dur,
      updatedAt: now,
      ext,
    });
  };

  const onFav = () => {
    const added = toggleFavorite({
      id: `movie:${streamId}`,
      type: "movie",
      refId: streamId,
      title,
      poster: poster || "",
    });
    setFav(added);
    toast.success(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };

  return (
    <AppShell>
      {playing ? (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-12">
          <button
            onClick={() => setPlaying(false)}
            className="focusable mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <VideoPlayer
            source={{ url: vodStreamUrl(account, streamId, ext) }}
            title={title}
            poster={poster}
            startPosition={resume?.position ?? 0}
            onProgress={handleProgress}
            lockLandscape
          />
        </div>
      ) : (
        <div className="relative">
          {/* Backdrop */}
          <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden">
            {backdrop && <img src={backdrop} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <Link
              to="/movies"
              className="focusable absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-black/70 lg:left-12"
            >
              <ArrowLeft className="h-4 w-4" /> Filmes
            </Link>
          </div>

          <div className="-mt-24 px-4 lg:px-12">
            {info.isLoading && !data ? (
              <div className="flex gap-6">
                <div className="h-64 w-44 shrink-0 animate-pulse rounded-xl bg-card" />
                <div className="flex-1 space-y-3 pt-8">
                  <div className="h-8 w-1/2 animate-pulse rounded bg-card" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-card" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="relative z-10 mx-auto w-44 shrink-0 overflow-hidden rounded-xl border border-border shadow-card md:mx-0">
                  {poster ? (
                    <img src={poster} alt={title} className="aspect-[2/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center bg-secondary text-muted-foreground">{title}</div>
                  )}
                </div>

                <div className="flex-1 pt-4 md:pt-24">
                  <h1 className="font-display text-3xl font-extrabold lg:text-4xl">{title}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {data?.info?.rating && (
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="h-4 w-4 fill-current" /> {data.info.rating}
                      </span>
                    )}
                    {data?.info?.releasedate && <span>{data.info.releasedate}</span>}
                    {data?.info?.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {data.info.duration}
                      </span>
                    )}
                    {data?.info?.genre && <span>{data.info.genre}</span>}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => setPlaying(true)}
                      className="focusable inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                    >
                      <Play className="h-5 w-5" fill="currentColor" />
                      {resume ? "Continuar assistindo" : "Assistir"}
                    </button>
                    <button
                      onClick={onFav}
                      className="focusable inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition-colors hover:border-primary/50"
                    >
                      <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
                    </button>
                  </div>

                  {data?.info?.plot && (
                    <div className="mt-6 max-w-2xl rounded-xl bg-card/80 p-4 shadow-card backdrop-blur">
                      <p className="text-sm leading-relaxed text-foreground/90">{data.info.plot}</p>
                    </div>
                  )}
                  {data?.info?.cast && (
                    <p className="mt-4 text-sm text-foreground/80">
                      <span className="font-semibold text-foreground">Elenco: </span>
                      {data.info.cast}
                    </p>
                  )}
                  {data?.info?.director && (
                    <p className="mt-1 text-sm text-foreground/80">
                      <span className="font-semibold text-foreground">Direção: </span>
                      {data.info.director}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
