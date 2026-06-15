import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { ContentCard } from "../components/ContentCard";
import { SeriesCard } from "../components/SeriesCard";
import { Grid } from "./movies";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getVodStreams, getSeries, getLiveStreams } from "../lib/xtream";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Buscar — FLOW TV" },
      { name: "description", content: "Busque canais, filmes e séries em toda a sua lista IPTV no FLOW TV." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const [q, setQ] = useState("");

  const movies = useCachedQuery(`${key}:vod:all`, () => getVodStreams(account!), { enabled: !!account });
  const series = useCachedQuery(`${key}:series:all`, () => getSeries(account!), { enabled: !!account });
  const live = useCachedQuery(`${key}:live:all`, () => getLiveStreams(account!), { enabled: !!account });

  const term = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (term.length < 2) return { movies: [], series: [], live: [] };
    const m = (movies.data ?? []).filter((x) => x.name.toLowerCase().includes(term)).slice(0, 40);
    const s = (series.data ?? []).filter((x) => x.name.toLowerCase().includes(term)).slice(0, 40);
    const l = (live.data ?? []).filter((x) => x.name.toLowerCase().includes(term)).slice(0, 40);
    return { movies: m, series: s, live: l };
  }, [term, movies.data, series.data, live.data]);

  const loading = movies.isLoading || series.isLoading || live.isLoading;
  const total = results.movies.length + results.series.length + results.live.length;

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
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-input bg-secondary/50 px-4 py-3.5">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar canais, filmes e séries…"
            className="w-full bg-transparent text-base focus:outline-none"
          />
        </div>

        {term.length < 2 ? (
          <p className="mt-12 text-center text-muted-foreground">Digite ao menos 2 letras para buscar.</p>
        ) : loading && total === 0 ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">Nada encontrado para “{q}”.</p>
        ) : (
          <div className="space-y-10">
            {results.movies.length > 0 && (
              <Section title="Filmes">
                {results.movies.map((m) => (
                  <ContentCard key={m.stream_id} to="/movie/$id" params={{ id: String(m.stream_id) }} title={m.name} image={m.stream_icon} rating={m.rating} />
                ))}
              </Section>
            )}
            {results.series.length > 0 && (
              <Section title="Séries">
                {results.series.map((s) => (
                  <SeriesCard key={s.series_id} account={account} cacheKey={key} series={s} />
                ))}
              </Section>
            )}
            {results.live.length > 0 && (
              <Section title="Canais ao vivo">
                {results.live.map((c) => (
                  <ContentCard key={c.stream_id} to="/live" title={c.name} image={c.stream_icon} wide />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      <Grid>{children}</Grid>
    </section>
  );
}
