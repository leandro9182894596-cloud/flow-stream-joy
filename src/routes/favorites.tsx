import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { ContentCard } from "../components/ContentCard";
import { Grid } from "./movies";
import { loadFavorites, type Favorite } from "../lib/storage";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favoritos — FLOW TV" },
      { name: "description", content: "Seus canais, filmes e séries favoritos no FLOW TV." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const [favs, setFavs] = useState<Favorite[]>([]);
  useEffect(() => {
    setFavs(loadFavorites());
  }, []);

  const routeFor = (f: Favorite) =>
    f.type === "movie" ? "/movie/$id" : f.type === "series" ? "/series/$id" : "/live";

  return (
    <AppShell>
      <div className="px-4 py-6 lg:px-12">
        <div className="mb-5 flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-extrabold">Favoritos</h1>
        </div>

        {favs.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            <Heart className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Você ainda não adicionou favoritos.</p>
            <p className="text-sm">Toque no coração em qualquer conteúdo para salvá-lo aqui.</p>
          </div>
        ) : (
          <Grid>
            {favs.map((f) => (
              <ContentCard
                key={f.id}
                to={routeFor(f)}
                params={f.type === "live" ? undefined : { id: String(f.refId) }}
                title={f.title}
                image={f.poster}
              />
            ))}
          </Grid>
        )}
      </div>
    </AppShell>
  );
}
