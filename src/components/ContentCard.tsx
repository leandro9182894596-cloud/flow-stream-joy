import { Link } from "@tanstack/react-router";
import { Play, ImageOff } from "lucide-react";
import { useState } from "react";
import { proxiedImage } from "../lib/xtream";

interface ContentCardProps {
  to: string;
  params?: Record<string, string>;
  title: string;
  image?: string;
  subtitle?: string;
  rating?: string;
  progress?: number; // 0..1
  wide?: boolean; // landscape (channels)
}

export function ContentCard({ to, params, title, image, subtitle, rating, progress, wide }: ContentCardProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Link
      to={to as never}
      params={params as never}
      className="focusable group block w-full"
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-glow ${
          wide ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        {image && !failed ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`h-full w-full ${wide ? "object-contain p-3" : "object-cover"} transition-transform duration-300 group-hover:scale-105`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary p-3 text-center">
            <ImageOff className="h-6 w-6 text-muted-foreground" />
            <span className="line-clamp-2 text-xs text-muted-foreground">{title}</span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
          </span>
        </div>

        {rating && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            ★ {rating}
          </span>
        )}

        {typeof progress === "number" && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>}
    </Link>
  );
}
