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
  const [start, setStart] = useState(0);
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
  const cover = proxiedImage(data?.info?.cover);
  const progressKey = `series:${seriesId}`;
  const resume = getProgress(progressKey);

  const playEpisode = (ep: FlatEpisode, startAt = 0) => {
    setCurrent(ep);
    setStart(startAt);
  };

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
            poster={proxiedImage(current.info?.movie_image) || cover}
            startPosition={start}
            onProgress={handleProgress}
            onEnded={handleNext}
            onNext={handleNext}
            nextLabel="Próximo episódio"
            lockLandscape
          />
        </div>
      ) : (
        <div>
          <div className="relative h-[45vh] min-h-[300px] w-full overflow-hidden 2xl:h-[55vh]">
            {cover && (
              <img
                src={cover}
                alt={title}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Soft dark overlay focused on the lower part + sides for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
            <Link
              to="/series"
              className="focusable absolute left-[4%] top-[5%] z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-[clamp(1rem,2vw,1.75rem)] py-[clamp(0.5rem,1vw,0.9rem)] text-[clamp(0.85rem,1.4vw,1.15rem)] font-semibold text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/60 focus-visible:scale-105"
            >
              <ArrowLeft className="h-[1.1em] w-[1.1em]" /> Séries
            </Link>
          </div>

          <div className="-mt-[12vh] px-[4%] xl:px-[6%]">
            {info.isLoading && !data ? (
              <div className="space-y-3">
                <div className="h-8 w-1/2 animate-pulse rounded bg-card" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-card" />
              </div>
            ) : (
              <>
                <h1 className="font-display text-[clamp(1.75rem,4vw,4rem)] font-extrabold leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
                  {title}
                </h1>
                <div className="mt-[clamp(0.5rem,1vw,1rem)] flex flex-wrap items-center gap-[clamp(0.75rem,1.5vw,1.5rem)] text-[clamp(0.85rem,1.4vw,1.2rem)] text-white/80">
                  {data?.info?.rating && (
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Star className="h-[1.1em] w-[1.1em] fill-current" /> {data.info.rating}
                    </span>
                  )}
                  {data?.info?.releaseDate && <span>{data.info.releaseDate}</span>}
                  {data?.info?.genre && <span>{data.info.genre}</span>}
                </div>

                <div className="mt-[clamp(1rem,2vw,2rem)] flex flex-wrap gap-[clamp(0.75rem,1.2vw,1.25rem)]">
                  {resume?.episodeId && (
                    <button
                      onClick={resumeEpisode}
                      className="focusable inline-flex items-center gap-[0.6em] rounded-full bg-primary px-[clamp(1.5rem,2.5vw,2.75rem)] py-[clamp(0.7rem,1.3vw,1.15rem)] text-[clamp(0.95rem,1.5vw,1.35rem)] font-bold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:ring-4 focus-visible:ring-primary/50"
                    >
                      <Play className="h-[1.2em] w-[1.2em]" fill="currentColor" /> Continuar
                    </button>
                  )}
                  {flatEpisodes[0] && (
                    <button
                      onClick={() => playEpisode(flatEpisodes[0])}
                      className="focusable inline-flex items-center gap-[0.6em] rounded-full border border-white/20 bg-white/10 px-[clamp(1.5rem,2.5vw,2.75rem)] py-[clamp(0.7rem,1.3vw,1.15rem)] text-[clamp(0.95rem,1.5vw,1.35rem)] font-bold text-white backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-primary/60 focus-visible:scale-105 focus-visible:ring-4 focus-visible:ring-primary/50"
                    >
                      <Play className="h-[1.2em] w-[1.2em]" /> Do começo
                    </button>
                  )}
                  <button
                    onClick={onFav}
                    aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    className="focusable inline-flex items-center gap-[0.6em] rounded-full border border-white/20 bg-white/10 px-[clamp(1.25rem,2vw,2rem)] py-[clamp(0.7rem,1.3vw,1.15rem)] text-[clamp(0.95rem,1.5vw,1.35rem)] font-bold text-white backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-primary/60 focus-visible:scale-105 focus-visible:ring-4 focus-visible:ring-primary/50"
                  >
                    <Heart className={`h-[1.2em] w-[1.2em] ${fav ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>

                {data?.info?.plot && (
                  <div className="mt-[clamp(1.25rem,2vw,2rem)] max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-[clamp(1rem,1.5vw,1.75rem)] shadow-card backdrop-blur-md">
                    <p className="line-clamp-3 text-[clamp(0.9rem,1.4vw,1.25rem)] leading-relaxed text-white">
                      {data.info.plot}
                    </p>
                  </div>
                )}

                {/* Seasons + episodes */}
                {seasonNumbers.length > 0 && (
                  <div className="mt-[clamp(1.5rem,3vw,3rem)]">
                    <div className="mb-[clamp(1rem,1.5vw,1.5rem)] flex flex-wrap items-center gap-[clamp(0.75rem,1.5vw,1.25rem)]">
                      <h2 className="font-display text-[clamp(1.25rem,2.2vw,2rem)] font-bold text-white">
                        Episódios
                      </h2>
                      <div className="relative">
                        <select
                          value={season ?? ""}
                          onChange={(e) => setSeason(Number(e.target.value))}
                          className="focusable appearance-none rounded-xl border border-white/20 bg-white/10 py-[clamp(0.5rem,1vw,0.85rem)] pl-[clamp(1rem,1.5vw,1.5rem)] pr-[clamp(2.25rem,3vw,3rem)] text-[clamp(0.85rem,1.4vw,1.15rem)] font-semibold text-white backdrop-blur-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
                        >
                          {seasonNumbers.map((sn) => (
                            <option key={sn} value={sn} className="bg-background text-foreground">
                              Temporada {sn}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-[1.2em] w-[1.2em] -translate-y-1/2 text-white/70" />
                      </div>
                    </div>

                    <ul className="grid grid-cols-1 gap-[clamp(0.75rem,1.2vw,1.25rem)] pb-[clamp(2rem,4vw,4rem)] lg:grid-cols-2 2xl:grid-cols-3">
                      {episodesOfSeason.map((ep) => (
                        <li key={ep.id}>
                          <button
                            onClick={() => playEpisode({ ...ep, seasonNum: season ?? 1 })}
                            className="focusable group flex w-full items-center gap-[clamp(0.75rem,1.2vw,1.25rem)] rounded-2xl border border-white/10 bg-white/5 p-[clamp(0.6rem,1vw,1rem)] text-left backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:border-primary/60 hover:bg-white/10 focus-visible:scale-[1.02] focus-visible:ring-4 focus-visible:ring-primary/50"
                          >
                            <div className="relative aspect-video w-[36%] max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-secondary">
                              {ep.info?.movie_image ? (
                                <img
                                  src={proxiedImage(ep.info.movie_image)}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <span className="grid h-full w-full place-items-center">
                                  <Play className="h-[2em] w-[2em] text-muted-foreground" />
                                </span>
                              )}
                              <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <Play className="h-[2.2em] w-[2.2em] text-white" fill="currentColor" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[clamp(0.95rem,1.4vw,1.25rem)] font-bold text-white">
                                {ep.episode_num}. {ep.title}
                              </p>
                              {ep.info?.plot && (
                                <p className="mt-1 line-clamp-2 text-[clamp(0.8rem,1.2vw,1rem)] text-white/70">
                                  {ep.info.plot}
                                </p>
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
