import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Clapperboard, ArrowLeft } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { SeriesCard } from "../components/SeriesCard";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getSeriesCategories, getSeries } from "../lib/xtream";
import { CategoryPanel } from "../components/CategoryPanel";
import { Grid } from "./movies";

export const Route = createFileRoute("/series/")({
  head: () => ({
    meta: [
      { title: "Séries — FLOW TV" },
      { name: "description", content: "Explore séries IPTV por categoria e assista episódios no FLOW TV." },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const [cat, setCat] = useState("all");
  const [visible, setVisible] = useState(60);
  const [showItems, setShowItems] = useState(false);

  const categories = useCachedQuery(`${key}:seriescats`, () => getSeriesCategories(account!), { enabled: !!account });
  const series = useCachedQuery(`${key}:series:all`, () => getSeries(account!), { enabled: !!account });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of series.data ?? []) map.set(s.category_id, (map.get(s.category_id) ?? 0) + 1);
    return map;
  }, [series.data]);

  const filtered = useMemo(() => {
    const list = series.data ?? [];
    return cat === "all" ? list : list.filter((s) => s.category_id === cat);
  }, [series.data, cat]);

  const pickCategory = (c: string) => {
    setCat(c);
    setVisible(60);
    setShowItems(true);
  };

  const activeName =
    cat === "all"
      ? "Todas as séries"
      : categories.data?.find((c) => c.category_id === cat)?.category_name ?? "Séries";

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
          <Clapperboard className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-extrabold">Séries</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Seleções */}
          <div className={showItems ? "hidden lg:block" : "block"}>
            <h2 className="mb-3 font-display text-lg font-bold">Seleções</h2>
            <CategoryPanel
              categories={categories.data ?? []}
              counts={counts}
              total={series.data?.length ?? 0}
              value={cat}
              onSelect={pickCategory}
              loading={categories.isLoading && !categories.data}
              allLabel="Todas as séries"
            />
          </div>

          {/* Séries da seleção */}
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

            {series.isLoading && !series.data ? (
              <Grid skeleton />
            ) : filtered.length === 0 ? (
              <p className="mt-8 text-center text-muted-foreground">Nenhuma série nesta seleção.</p>
            ) : (
              <>
                <Grid>
                  {filtered.slice(0, visible).map((s) => (
                    <SeriesCard key={s.series_id} account={account} cacheKey={key} series={s} />
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

