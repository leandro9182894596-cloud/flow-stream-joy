import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, ArrowLeft, Star, Heart, ChevronDown } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { VideoPlayer } from "../components/VideoPlayer";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getSeriesInfo, seriesStreamUrl, proxiedImage, type SeriesEpisode } from "../lib/xtream";
import { getProgress, saveProgress, toggleFavorite, isFavorite } from "../lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/series/$id")({
  head: () => ({
    meta: [
      { title: "Série — FLOW TV" },
      { name: "description", content: "Detalhes, temporadas e episódios da série no FLOW TV." },
    ],
  }),
  component: SeriesDetailPage,
});

interface FlatEpisode extends SeriesEpisode {
  seasonNum: number;
}

function SeriesDetailPage() {
  const { id } = useParams({ from: "/series/$id" });
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const seriesId = Number(id);

  const info = useCachedQuery(`${key}:seriesinfo:${id}`, () => getSeriesInfo(account!, seriesId), {
    enabled: !!account,
    maxAgeMs: 24 * 60 * 60 * 1000,
  });

  const [season, setSeason] = useState<number | null>(null);
  const [current, setCurrent] = useState<FlatEpisode | null>(null);
  const [fav, setFav] = useState(false);
  const lastSave = useRef(0);

  const data = info.data;

  const seasonNumbers = useMemo(() => {
    if (!data?.episodes) return [];
    return Object.keys(data.episodes)
      .map(Number)
      .sort((a, b) => a - b);
  }, [data]);

  useEffect(() => {
    if (season === null && seasonNumbers.length) setSeason(seasonNumbers[0]);
  }, [seasonNumbers, season]);

  useEffect(() => {
    setFav(isFavorite(`series:${seriesId}`));
  }, [seriesId]);

  const flatEpisodes = useMemo<FlatEpisode[]>(() => {
    if (!data?.episodes) return [];
    return seasonNumbers.flatMap((sn) =>
      (data.episodes[String(sn)] || []).map((e) => ({ ...e, seasonNum: sn })),
    );
  }, [data, seasonNumbers]);

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = data?.info?.name || "Série";
  const cover = data?.info?.cover;
  const progressKey = `series:${seriesId}`;
  const resume = getProgress(progressKey);

  const playEpisode = (ep: FlatEpisode, startAt = 0) => {
    setCurrent(ep);
    setStart(startAt);
  };

  const [start, setStart] = useState(0);

  const handleNext = () => {
    if (!current) return;
    const idx = flatEpisodes.findIndex((e) => e.id === current.id && e.seasonNum === current.seasonNum);
    const next = flatEpisodes[idx + 1];
    if (next) {
      setStart(0);
      setCurrent(next);
      toast.success(`Próximo: ${next.title}`);
    } else {
      toast.info("Você chegou ao fim da série.");
      setCurrent(null);
    }
  };

  const handleProgress = (pos: number, dur: number) => {
    if (!current) return;
    const now = Date.now();
    if (now - lastSave.current < 5000) return;
    lastSave.current = now;
    saveProgress({
      key: progressKey,
      type: "series",
      refId: seriesId,
      seriesId,
      episodeId: current.id,
      title: `${title} — T${current.seasonNum}:E${current.episode_num}`,
      poster: cover || "",
      position: pos,
      duration: dur,
      updatedAt: now,
      ext: current.container_extension,
    });
  };

  const onFav = () => {
    const added = toggleFavorite({
      id: `series:${seriesId}`,
      type: "series",
      refId: seriesId,
      title,
      poster: cover || "",
    });
    setFav(added);
    toast.success(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };

  const resumeEpisode = () => {
    if (!resume?.episodeId) return;
    const ep = flatEpisodes.find((e) => e.id === resume.episodeId);
    if (ep) playEpisode(ep, resume.position);
  };

  const episodesOfSeason = data?.episodes?.[String(season ?? "")] || [];

  return (
    <AppShell>
      {current ? (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-12">
          <button
            onClick={() => setCurrent(null)}
            className="focusable mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <VideoPlayer
            key={current.id}
            source={{ url: seriesStreamUrl(account, current.id, current.container_extension || "mp4") }}
            title={current.title}
            subtitle={`${title} • T${current.seasonNum} E${current.episode_num}`}
            poster={current.info?.movie_image || cover}
            startPosition={start}
            onProgress={handleProgress}
            onEnded={handleNext}
            onNext={handleNext}
            nextLabel="Próximo episódio"
          />
        </div>
      ) : (
        <div>
          <div className="relative h-[40vh] min-h-[280px] w-full overflow-hidden">
            {cover && <img src={cover} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <Link
              to="/series"
              className="focusable absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-black/70 lg:left-12"
            >
              <ArrowLeft className="h-4 w-4" /> Séries
            </Link>
          </div>

          <div className="-mt-20 px-4 lg:px-12">
            {info.isLoading && !data ? (
              <div className="space-y-3">
                <div className="h-8 w-1/2 animate-pulse rounded bg-card" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-card" />
              </div>
            ) : (
              <>
                <h1 className="font-display text-3xl font-extrabold lg:text-4xl">{title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {data?.info?.rating && (
                    <span className="flex items-center gap-1 text-primary">
                      <Star className="h-4 w-4 fill-current" /> {data.info.rating}
                    </span>
                  )}
                  {data?.info?.releaseDate && <span>{data.info.releaseDate}</span>}
                  {data?.info?.genre && <span>{data.info.genre}</span>}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {resume?.episodeId && (
                    <button
                      onClick={resumeEpisode}
                      className="focusable inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                    >
                      <Play className="h-5 w-5" fill="currentColor" /> Continuar
                    </button>
                  )}
                  {flatEpisodes[0] && (
                    <button
                      onClick={() => playEpisode(flatEpisodes[0])}
                      className="focusable inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition-colors hover:border-primary/50"
                    >
                      <Play className="h-5 w-5" /> Do começo
                    </button>
                  )}
                  <button
                    onClick={onFav}
                    className="focusable inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition-colors hover:border-primary/50"
                  >
                    <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>

                {data?.info?.plot && (
                  <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.info.plot}</p>
                )}

                {/* Seasons + episodes */}
                {seasonNumbers.length > 0 && (
                  <div className="mt-8">
                    <div className="mb-4 flex items-center gap-3">
                      <h2 className="font-display text-xl font-bold">Episódios</h2>
                      <div className="relative">
                        <select
                          value={season ?? ""}
                          onChange={(e) => setSeason(Number(e.target.value))}
                          className="focusable appearance-none rounded-lg border border-border bg-card py-2 pl-4 pr-9 text-sm font-medium focus:outline-none"
                        >
                          {seasonNumbers.map((sn) => (
                            <option key={sn} value={sn}>
                              Temporada {sn}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <ul className="space-y-2 pb-8">
                      {episodesOfSeason.map((ep) => (
                        <li key={ep.id}>
                          <button
                            onClick={() => playEpisode({ ...ep, seasonNum: season ?? 1 })}
                            className="focusable group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
                          >
                            <div className="relative grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                              {ep.info?.movie_image ? (
                                <img src={ep.info.movie_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                <Play className="h-6 w-6 text-primary-foreground" fill="currentColor" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {ep.episode_num}. {ep.title}
                              </p>
                              {ep.info?.plot && (
                                <p className="line-clamp-2 text-xs text-muted-foreground">{ep.info.plot}</p>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
