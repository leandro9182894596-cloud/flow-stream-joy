import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Tv, Search, Heart, ChevronRight, ArrowLeft } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { VideoPlayer } from "../components/VideoPlayer";
import { useRequireAccount } from "../hooks/use-require-account";
import { useCachedQuery, accountKey } from "../lib/queries";
import { getLiveCategories, getLiveStreams, liveStreamUrl, proxiedImage, type LiveStream } from "../lib/xtream";
import { toggleFavorite, isFavorite } from "../lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "TV ao Vivo — FLOW TV" },
      { name: "description", content: "Assista canais de TV ao vivo IPTV com player estável no FLOW TV." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { account, ready } = useRequireAccount();
  const key = accountKey(account);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LiveStream | null>(null);
  const [fav, setFav] = useState(false);
  const [showChannels, setShowChannels] = useState(false);

  const categories = useCachedQuery(`${key}:livecats`, () => getLiveCategories(account!), { enabled: !!account });
  const channels = useCachedQuery(`${key}:live:all`, () => getLiveStreams(account!), { enabled: !!account });

  const countByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of channels.data ?? []) {
      map.set(c.category_id, (map.get(c.category_id) ?? 0) + 1);
    }
    return map;
  }, [channels.data]);

  const filtered = useMemo(() => {
    let list = channels.data ?? [];
    if (cat !== "all") list = list.filter((c) => c.category_id === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.slice(0, 400);
  }, [channels.data, cat, search]);

  useEffect(() => {
    if (!selected && filtered.length) setSelected(filtered[0]);
  }, [filtered, selected]);

  useEffect(() => {
    if (selected) setFav(isFavorite(`live:${selected.stream_id}`));
  }, [selected]);

  if (!ready || !account) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const onFav = () => {
    if (!selected) return;
    const added = toggleFavorite({
      id: `live:${selected.stream_id}`,
      type: "live",
      refId: selected.stream_id,
      title: selected.name,
      poster: selected.stream_icon,
    });
    setFav(added);
    toast.success(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };

  const currentIndex = selected ? filtered.findIndex((c) => c.stream_id === selected.stream_id) : -1;
  const goNext = () => {
    if (!filtered.length) return;
    const next = filtered[(currentIndex + 1 + filtered.length) % filtered.length];
    setSelected(next);
  };
  const goPrev = () => {
    if (!filtered.length) return;
    const prev = filtered[(currentIndex - 1 + filtered.length) % filtered.length];
    setSelected(prev);
  };

  const allCategories = [
    { category_id: "all", category_name: "Todos os canais" },
    ...(categories.data ?? []),
  ];
  const activeCatName =
    allCategories.find((c) => c.category_id === cat)?.category_name ?? "Canais";

  const pickCategory = (id: string) => {
    setCat(id);
    setShowChannels(true);
  };

  return (
    <AppShell>
      <div className="grid gap-6 px-4 py-6 lg:grid-cols-[1fr_240px_340px] lg:px-12">
        {/* Player */}
        <div className="lg:sticky lg:top-20 lg:h-fit">
          {selected ? (
            <>
              <VideoPlayer
                key={selected.stream_id}
                source={{ url: liveStreamUrl(account, selected.stream_id), isLive: true }}
                title={selected.name}
                poster={proxiedImage(selected.stream_icon)}
                onNext={filtered.length > 1 ? goNext : undefined}
                nextLabel="Próximo canal"
                onPrev={filtered.length > 1 ? goPrev : undefined}
                prevLabel="Canal anterior"
              />
              <div className="mt-3 flex items-center gap-2 lg:hidden">
                <button
                  onClick={goPrev}
                  className="focusable flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  ‹ Anterior
                </button>
                <button
                  onClick={goNext}
                  className="focusable flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  Próximo ›
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <h1 className="font-display text-xl font-bold">{selected.name}</h1>
                <button
                  onClick={onFav}
                  className="focusable flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                  {fav ? "Favorito" : "Favoritar"}
                </button>
              </div>
            </>
          ) : (
            <div className="grid aspect-video place-items-center rounded-xl bg-card">
              <Tv className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Category selection */}
        <div className={`min-w-0 ${showChannels ? "hidden lg:block" : "block"}`}>
          <h2 className="mb-3 font-display text-lg font-bold">Seleções</h2>
          {categories.isLoading && !categories.data ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-card" />
              ))}
            </div>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-200px)]">
              {allCategories.map((c) => (
                <li key={c.category_id}>
                  <button
                    onClick={() => pickCategory(c.category_id)}
                    className={`focusable flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      cat === c.category_id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="line-clamp-1">{c.category_name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      {c.category_id === "all"
                        ? channels.data?.length ?? 0
                        : countByCat.get(c.category_id) ?? 0}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Channel list */}
        <div className={`min-w-0 ${showChannels ? "block" : "hidden lg:block"}`}>
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setShowChannels(false)}
              className="focusable inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" /> Seleções
            </button>
            <h2 className="line-clamp-1 font-display text-lg font-bold">{activeCatName}</h2>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-secondary/50 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar canal…"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          {channels.isLoading && !channels.data ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg bg-card p-4 text-sm text-muted-foreground">
              Nenhum canal nesta seleção.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-280px)]">
              {filtered.map((c) => (
                <li key={c.stream_id}>
                  <button
                    onClick={() => setSelected(c)}
                    className={`focusable flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                      selected?.stream_id === c.stream_id
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-card"
                    }`}
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary">
                      {c.stream_icon ? (
                        <img src={proxiedImage(c.stream_icon)} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Tv className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="line-clamp-2 text-sm font-medium">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
