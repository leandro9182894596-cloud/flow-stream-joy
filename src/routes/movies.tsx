import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Film, ArrowLeft } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { ContentCard } from "../components/ContentCard";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getVodCategories, getVodStreams } from "../lib/xtream";
import { CategoryPanel } from "../components/CategoryPanel";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Filmes — FLOW TV" },
      { name: "description", content: "Explore o catálogo de filmes IPTV por categoria no FLOW TV." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const [cat, setCat] = useState("all");
  const [visible, setVisible] = useState(60);
  const [showItems, setShowItems] = useState(false);

  const categories = useCachedQuery(`${key}:vodcats`, () => getVodCategories(account!), { enabled: !!account });
  const movies = useCachedQuery(`${key}:vod:all`, () => getVodStreams(account!), { enabled: !!account });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movies.data ?? []) map.set(m.category_id, (map.get(m.category_id) ?? 0) + 1);
    return map;
  }, [movies.data]);

  const filtered = useMemo(() => {
    const list = movies.data ?? [];
    return cat === "all" ? list : list.filter((m) => m.category_id === cat);
  }, [movies.data, cat]);

  const pickCategory = (c: string) => {
    setCat(c);
    setVisible(60);
    setShowItems(true);
  };

  const activeName =
    cat === "all"
      ? "Todos os filmes"
      : categories.data?.find((c) => c.category_id === cat)?.category_name ?? "Filmes";

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-6 lg:px-12">
        <div className="mb-5 flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-extrabold">Filmes</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Seleções */}
          <div className={showItems ? "hidden lg:block" : "block"}>
            <h2 className="mb-3 font-display text-lg font-bold">Seleções</h2>
            <CategoryPanel
              categories={categories.data ?? []}
              counts={counts}
              total={movies.data?.length ?? 0}
              value={cat}
              onSelect={pickCategory}
              loading={categories.isLoading && !categories.data}
              allLabel="Todos os filmes"
            />
          </div>

          {/* Filmes da seleção */}
          <div className={showItems ? "block" : "hidden lg:block"}>
            <div className="mb-1 flex items-center gap-2">
              <button
                onClick={() => setShowItems(false)}
                className="focusable inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" /> Seleções
              </button>
              <h2 className="line-clamp-1 font-display text-lg font-bold">{activeName}</h2>
              <span className="ml-1 text-sm text-muted-foreground">{filtered.length}</span>
            </div>

            {movies.isLoading && !movies.data ? (
              <Grid skeleton />
            ) : filtered.length === 0 ? (
              <p className="mt-8 text-center text-muted-foreground">Nenhum filme nesta seleção.</p>
            ) : (
              <>
                <Grid>
                  {filtered.slice(0, visible).map((m) => (
                    <ContentCard
                      key={m.stream_id}
                      to="/movie/$id"
                      params={{ id: String(m.stream_id) }}
                      title={m.name}
                      image={m.stream_icon}
                      rating={m.rating}
                    />
                  ))}
                </Grid>
                {visible < filtered.length && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setVisible((v) => v + 60)}
                      className="focusable rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold transition-colors hover:border-primary/50"
                    >
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}


export function Grid({ children, skeleton }: { children?: React.ReactNode; skeleton?: boolean }) {
  if (skeleton) {
    return (
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {children}
    </div>
  );
}
