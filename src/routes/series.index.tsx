import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Clapperboard } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { SeriesCard } from "../components/SeriesCard";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getSeriesCategories, getSeries } from "../lib/xtream";
import { CategoryBar } from "../components/CategoryBar";
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

  const categories = useCachedQuery(`${key}:seriescats`, () => getSeriesCategories(account!), { enabled: !!account });
  const series = useCachedQuery(`${key}:series:all`, () => getSeries(account!), { enabled: !!account });

  const filtered = useMemo(() => {
    const list = series.data ?? [];
    return cat === "all" ? list : list.filter((s) => s.category_id === cat);
  }, [series.data, cat]);

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
          <span className="ml-2 text-sm text-muted-foreground">{filtered.length} títulos</span>
        </div>

        <CategoryBar
          categories={categories.data ?? []}
          value={cat}
          onChange={(c) => {
            setCat(c);
            setVisible(60);
          }}
        />

        {series.isLoading && !series.data ? (
          <Grid skeleton />
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">Nenhuma série nesta categoria.</p>
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
    </AppShell>
  );
}
