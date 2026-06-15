import { useState } from "react";
import { ContentCard } from "./ContentCard";
import { useCachedQuery } from "../lib/queries";
import { getSeriesInfo, type Account, type SeriesInfo, type SeriesItem } from "../lib/xtream";

interface SeriesCardProps {
  account: Account;
  cacheKey: string;
  series: SeriesItem;
}

export function SeriesCard({ account, cacheKey, series }: SeriesCardProps) {
  const [needsDetails, setNeedsDetails] = useState(!series.cover);
  const details = useCachedQuery(
    `${cacheKey}:seriesinfo:${series.series_id}:cover`,
    () => getSeriesInfo(account, series.series_id),
    { enabled: needsDetails, maxAgeMs: 24 * 60 * 60 * 1000 },
  );
  const fallbackImage = details.data ? bestSeriesImage(details.data, series.cover) : undefined;

  return (
    <ContentCard
      to="/series/$id"
      params={{ id: String(series.series_id) }}
      title={series.name}
      image={series.cover}
      fallbackImage={fallbackImage}
      rating={series.rating}
      onImageUnavailable={() => setNeedsDetails(true)}
    />
  );
}

function bestSeriesImage(data: SeriesInfo, currentCover?: string): string | undefined {
  if (data.info?.cover && data.info.cover !== currentCover) return data.info.cover;
  for (const episodes of Object.values(data.episodes ?? {})) {
    const image = episodes.find((ep) => ep.info?.movie_image)?.info?.movie_image;
    if (image) return image;
  }
  return data.info?.cover;
}