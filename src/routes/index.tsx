import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Play, Info, Loader2, History, X } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "../components/AppShell";
import { ContentCard } from "../components/ContentCard";
import { useRequireAccount } from "../hooks/use-require-account";
import { useSettings } from "../hooks/use-settings";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getVodStreams, getSeries, getLiveStreams } from "../lib/xtream";
import { loadProgress, removeProgress, type ProgressEntry } from "../lib/storage";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FLOW TV — Início" },
      { name: "description", content: "Canais ao vivo, filmes e séries com player inteligente no FLOW TV." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const settings = useSettings();

  const movies = useCachedQuery(`${key}:vod:all`, () => getVodStreams(account!), { enabled: !!account });
  const series = useCachedQuery(`${key}:series:all`, () => getSeries(account!), { enabled: !!account });
  const live = useCachedQuery(`${key}:live:all`, () => getLiveStreams(account!), { enabled: !!account });

  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const featured = useMemo(() => {
    const list = movies.data ?? [];
    const withImg = list.filter((m) => m.stream_icon);
    return withImg.length ? withImg[Math.floor(Math.random() * Math.min(withImg.length, 30))] : list[0];
  }, [movies.data]);

  // Preload buffer: how many of the core catalogs are ready
  const readyCount = [movies.data, series.data, live.data].filter(Boolean).length;
  const preloading = !!account && readyCount < 3 && (movies.isLoading || series.isLoading || live.isLoading);

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (preloading) {
    return <SplashPreloader logo={settings.logo} background={settings.background} ready={readyCount} total={3} />;
  }


  const removeFromHistory = (k: string) => {
    removeProgress(k);
    setProgress(loadProgress());
  };

  return (
    <AppShell>
      {/* Hero */}
      {featured && (
        <section className="relative h-[52vh] min-h-[360px] w-full overflow-hidden">
          {featured.stream_icon && (
            <img
              src={featured.stream_icon}
              alt={featured.name}
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-end p-6 lg:p-12">
            <span className="mb-3 w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              Em destaque
            </span>
            <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight lg:text-5xl">
              {featured.name}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/movie/$id"
                params={{ id: String(featured.stream_id) }}
                className="focusable inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <Play className="h-5 w-5" fill="currentColor" /> Assistir
              </Link>
              <Link
                to="/movie/$id"
                params={{ id: String(featured.stream_id) }}
                className="focusable inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3 font-semibold text-foreground backdrop-blur transition-colors hover:bg-card"
              >
                <Info className="h-5 w-5" /> Detalhes
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="space-y-10 px-4 py-8 lg:px-12">
        {/* Ad banner */}
        {settings.banner && <AdBanner image={settings.banner} link={settings.bannerLink} />}


        {/* Continue watching */}
        {progress.length > 0 && (
          <Row title="Continuar assistindo" icon={<History className="h-5 w-5 text-primary" />}>
            {progress.map((p) => (
              <div key={p.key} className="group/cw relative">
                <ContentCard
                  to={p.type === "movie" ? "/movie/$id" : "/series/$id"}
                  params={{ id: String(p.refId) }}
                  title={p.title}
                  image={p.poster}
                  progress={p.duration ? p.position / p.duration : 0}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromHistory(p.key);
                  }}
                  className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-foreground opacity-0 transition-opacity group-hover/cw:opacity-100"
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </Row>
        )}

        <RowSection
          title="Filmes em destaque"
          loading={movies.isLoading && !movies.data}
          to="/movies"
          items={(movies.data ?? []).slice(0, 18).map((m) => ({
            id: m.stream_id,
            to: "/movie/$id",
            title: m.name,
            image: m.stream_icon,
            rating: m.rating,
          }))}
        />

        <RowSection
          title="Séries populares"
          loading={series.isLoading && !series.data}
          to="/series"
          items={(series.data ?? []).slice(0, 18).map((s) => ({
            id: s.series_id,
            to: "/series/$id",
            title: s.name,
            image: s.cover,
            rating: s.rating,
          }))}
        />

        <RowSection
          title="Canais ao vivo"
          loading={live.isLoading && !live.data}
          to="/live"
          wide
          items={(live.data ?? []).slice(0, 18).map((c) => ({
            id: c.stream_id,
            to: "/live",
            title: c.name,
            image: c.stream_icon,
          }))}
        />
      </div>
    </AppShell>
  );
}

function Row({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {Array.isArray(children) ? (
          children.map((c, i) => (
            <div key={i} className="w-32 shrink-0 sm:w-40">
              {c}
            </div>
          ))
        ) : (
          <>{children}</>
        )}
      </div>
    </section>
  );
}

interface RowItem {
  id: number;
  to: string;
  title: string;
  image?: string;
  rating?: string;
}

function RowSection({
  title,
  items,
  loading,
  to,
  wide,
}: {
  title: string;
  items: RowItem[];
  loading: boolean;
  to: string;
  wide?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <Link to={to as never} className="focusable text-sm font-medium text-primary hover:underline">
          Ver tudo
        </Link>
      </div>
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`shrink-0 animate-pulse rounded-xl bg-card ${wide ? "aspect-video w-56" : "aspect-[2/3] w-32 sm:w-40"}`}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum conteúdo disponível.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {items.map((item) => (
            <div key={item.id} className={`shrink-0 ${wide ? "w-56" : "w-32 sm:w-40"}`}>
              <ContentCard
                to={item.to}
                params={{ id: String(item.id) }}
                title={item.title}
                image={item.image}
                rating={item.rating}
                wide={wide}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
