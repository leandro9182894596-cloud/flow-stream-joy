import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipForward,
  Loader2,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";

export interface PlayerSource {
  url: string;
  isLive?: boolean;
}

interface VideoPlayerProps {
  source: PlayerSource;
  title?: string;
  subtitle?: string;
  poster?: string;
  startPosition?: number;
  autoPlay?: boolean;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}

interface TrackOption {
  id: number;
  label: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function VideoPlayer({
  source,
  title,
  subtitle,
  poster,
  startPosition = 0,
  autoPlay = true,
  onProgress,
  onEnded,
  onNext,
  nextLabel,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [offline, setOffline] = useState(false);

  const [menu, setMenu] = useState<null | "main" | "quality" | "audio" | "subs" | "speed">(null);
  const [levels, setLevels] = useState<TrackOption[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const [subTracks, setSubTracks] = useState<TrackOption[]>([]);
  const [currentSub, setCurrentSub] = useState(-1); // -1 = off
  const [speed, setSpeed] = useState(1);

  const startProgressRef = useRef(startPosition);
  startProgressRef.current = startPosition;

  // ---- setup playback ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    const isHls = /\.m3u8($|\?)/i.test(source.url) || source.isLive;

    const seekToStart = () => {
      if (startProgressRef.current > 0 && !source.isLive) {
        try {
          video.currentTime = startProgressRef.current;
        } catch {
          /* ignore */
        }
      }
    };

    async function setup() {
      if (isHls) {
        const HlsMod = (await import("hls.js")).default;
        if (cancelled) return;
        if (HlsMod.isSupported()) {
          const hls = new HlsMod({
            // Intelligent buffering
            maxBufferLength: 30,
            maxMaxBufferLength: 120,
            backBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000,
            // Adaptive bitrate based on measured bandwidth
            abrEwmaDefaultEstimate: 1_000_000,
            startLevel: -1,
            lowLatencyMode: !!source.isLive,
            // Robust recovery
            fragLoadingMaxRetry: 6,
            manifestLoadingMaxRetry: 6,
            levelLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 1000,
          });
          hlsRef.current = hls;
          hls.loadSource(source.url);
          hls.attachMedia(video!);

          hls.on(HlsMod.Events.MANIFEST_PARSED, () => {
            setLevels(
              hls.levels.map((l, i) => ({
                id: i,
                label: qualityLabel(l.height, l.bitrate),
              })),
            );
            setLoading(false);
            seekToStart();
            if (autoPlay) video!.play().catch(() => setPlaying(false));
          });
          hls.on(HlsMod.Events.LEVEL_SWITCHED, (_e, d) => setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level));
          hls.on(HlsMod.Events.AUDIO_TRACKS_UPDATED, () => {
            setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Áudio ${i + 1}` })));
          });
          hls.on(HlsMod.Events.AUDIO_TRACK_SWITCHED, (_e, d) => setCurrentAudio(d.id));
          hls.on(HlsMod.Events.SUBTITLE_TRACKS_UPDATED, () => {
            setSubTracks(hls.subtitleTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Legenda ${i + 1}` })));
          });
          hls.on(HlsMod.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            switch (data.type) {
              case HlsMod.ErrorTypes.NETWORK_ERROR:
                // Auto-reconnect
                setReconnecting(true);
                if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
                reconnectTimer.current = setTimeout(() => {
                  try {
                    hls.startLoad();
                  } catch {
                    /* ignore */
                  }
                }, 1500);
                break;
              case HlsMod.ErrorTypes.MEDIA_ERROR:
                try {
                  hls.recoverMediaError();
                } catch {
                  setError("Erro de mídia. Tente recarregar.");
                }
                break;
              default:
                setError("Não foi possível reproduzir este conteúdo.");
                hls.destroy();
            }
          });
          hls.on(HlsMod.Events.FRAG_LOADED, () => setReconnecting(false));
        } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS (Safari/iOS)
          video!.src = source.url;
          video!.addEventListener("loadedmetadata", () => {
            setLoading(false);
            seekToStart();
            if (autoPlay) video!.play().catch(() => setPlaying(false));
          });
        } else {
          setError("Seu navegador não suporta este formato de transmissão.");
        }
      } else {
        // Direct MP4/TS
        video!.src = source.url;
        video!.addEventListener(
          "loadedmetadata",
          () => {
            setLoading(false);
            seekToStart();
            if (autoPlay) video!.play().catch(() => setPlaying(false));
          },
          { once: true },
        );
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.url]);

  // ---- network online/offline ----
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      if (hlsRef.current) {
        try {
          hlsRef.current.startLoad();
        } catch {
          /* ignore */
        }
      } else {
        videoRef.current?.play().catch(() => {});
      }
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ---- video element events ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setReconnecting(false);
    };
    const onTime = () => {
      setCurrent(video.currentTime);
      if (onProgress && video.duration) onProgress(video.currentTime, video.duration);
    };
    const onDur = () => setDuration(video.duration || 0);
    const onEnd = () => onEnded?.();
    const onVol = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDur);
    video.addEventListener("ended", onEnd);
    video.addEventListener("volumechange", onVol);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDur);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("volumechange", onVol);
    };
  }, [onProgress, onEnded]);

  // ---- fullscreen ----
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!menu) setControlsVisible(false);
    }, 3500);
  }, [menu]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  }, []);

  // keyboard / remote control
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "Enter":
          if ((e.target as HTMLElement).tagName !== "BUTTON") {
            e.preventDefault();
            togglePlay();
          }
          break;
        case "ArrowRight":
          if (!source.isLive) seek(v.currentTime + 10);
          showControls();
          break;
        case "ArrowLeft":
          if (!source.isLive) seek(v.currentTime - 10);
          showControls();
          break;
        case "ArrowUp":
          v.volume = Math.min(1, v.volume + 0.1);
          showControls();
          break;
        case "ArrowDown":
          v.volume = Math.max(0, v.volume - 0.1);
          showControls();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seek, showControls, togglePlay, toggleFullscreen, toggleMute, source.isLive]);

  const selectLevel = (id: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id; // -1 = auto
      setCurrentLevel(id);
    }
    setMenu(null);
  };
  const selectAudio = (id: number) => {
    if (hlsRef.current) hlsRef.current.audioTrack = id;
    setMenu(null);
  };
  const selectSub = (id: number) => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = id; // -1 = off
    setCurrentSub(id);
    setMenu(null);
  };
  const selectSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s);
    setMenu(null);
  };

  const reload = () => {
    setError(null);
    setLoading(true);
    if (hlsRef.current) {
      hlsRef.current.startLoad();
    } else if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black select-none"
      onMouseMove={showControls}
      onClick={() => {
        if (menu) setMenu(null);
        else showControls();
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="h-full w-full"
        onDoubleClick={toggleFullscreen}
      />

      {/* Loading / reconnect overlay */}
      {(loading || reconnecting) && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-2 text-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            {reconnecting && <span className="text-sm font-medium">Reconectando…</span>}
          </div>
        </div>
      )}

      {offline && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
          <WifiOff className="h-3.5 w-3.5" /> Sem internet — aguardando conexão
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
          <WifiOff className="h-12 w-12 text-destructive" />
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <button
            onClick={reload}
            className="focusable inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      )}

      {/* Center play button */}
      {!playing && !loading && !error && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="focusable absolute inset-0 z-10 flex items-center justify-center"
          aria-label="Reproduzir"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-glow transition-transform hover:scale-105">
            <Play className="h-9 w-9 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Title bar */}
      <div
        className={`absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {title && <h2 className="font-display text-lg font-bold text-foreground drop-shadow">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-10 transition-opacity ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        {!source.isLive ? (
          <div className="mb-2 flex items-center gap-3">
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{formatTime(current)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
              aria-label="Progresso"
            />
            <span className="w-12 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
          </div>
        ) : (
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> AO VIVO
            </span>
            <Wifi className="h-3.5 w-3.5 text-primary" />
          </div>
        )}

        <div className="flex items-center gap-1">
          <CtrlButton onClick={togglePlay} label={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </CtrlButton>

          <div className="group flex items-center">
            <CtrlButton onClick={toggleMute} label="Mudo">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </CtrlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = Number(e.target.value) === 0;
              }}
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/20 accent-primary transition-all duration-200 group-hover:w-20"
              aria-label="Volume"
            />
          </div>

          <div className="flex-1" />

          {onNext && (
            <CtrlButton onClick={onNext} label={nextLabel || "Próximo"}>
              <SkipForward className="h-5 w-5" />
            </CtrlButton>
          )}

          {/* Settings menu */}
          <div className="relative">
            <CtrlButton onClick={() => setMenu(menu ? null : "main")} label="Configurações">
              <Settings className={`h-5 w-5 transition-transform ${menu ? "rotate-45" : ""}`} />
            </CtrlButton>

            {menu && (
              <div className="absolute bottom-12 right-0 w-52 overflow-hidden rounded-xl border border-border bg-popover/95 text-sm shadow-card backdrop-blur">
                {menu === "main" && (
                  <ul>
                    <MenuRow label="Velocidade" value={`${speed}x`} onClick={() => setMenu("speed")} />
                    {levels.length > 0 && (
                      <MenuRow
                        label="Qualidade"
                        value={currentLevel === -1 ? "Auto" : levels.find((l) => l.id === currentLevel)?.label || "Auto"}
                        onClick={() => setMenu("quality")}
                      />
                    )}
                    {audioTracks.length > 1 && (
                      <MenuRow
                        label="Áudio"
                        value={audioTracks.find((a) => a.id === currentAudio)?.label || "Padrão"}
                        onClick={() => setMenu("audio")}
                      />
                    )}
                    {subTracks.length > 0 && (
                      <MenuRow
                        label="Legendas"
                        value={currentSub === -1 ? "Desligadas" : subTracks.find((s) => s.id === currentSub)?.label || "—"}
                        onClick={() => setMenu("subs")}
                      />
                    )}
                  </ul>
                )}
                {menu === "speed" && (
                  <MenuList
                    title="Velocidade"
                    onBack={() => setMenu("main")}
                    options={SPEEDS.map((s) => ({ id: s, label: `${s}x`, active: s === speed }))}
                    onSelect={(id) => selectSpeed(id)}
                  />
                )}
                {menu === "quality" && (
                  <MenuList
                    title="Qualidade"
                    onBack={() => setMenu("main")}
                    options={[
                      { id: -1, label: "Auto", active: currentLevel === -1 },
                      ...levels.map((l) => ({ id: l.id, label: l.label, active: l.id === currentLevel })),
                    ]}
                    onSelect={(id) => selectLevel(id)}
                  />
                )}
                {menu === "audio" && (
                  <MenuList
                    title="Áudio"
                    onBack={() => setMenu("main")}
                    options={audioTracks.map((a) => ({ id: a.id, label: a.label, active: a.id === currentAudio }))}
                    onSelect={(id) => selectAudio(id)}
                  />
                )}
                {menu === "subs" && (
                  <MenuList
                    title="Legendas"
                    onBack={() => setMenu("main")}
                    options={[
                      { id: -1, label: "Desligadas", active: currentSub === -1 },
                      ...subTracks.map((s) => ({ id: s.id, label: s.label, active: s.id === currentSub })),
                    ]}
                    onSelect={(id) => selectSub(id)}
                  />
                )}
              </div>
            )}
          </div>

          <CtrlButton onClick={toggleFullscreen} label="Tela cheia">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </CtrlButton>
        </div>
      </div>
    </div>
  );
}

function CtrlButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="focusable grid h-10 w-10 place-items-center rounded-lg text-foreground/90 transition-colors hover:bg-white/10 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MenuRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-foreground transition-colors hover:bg-white/10"
      >
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{value}</span>
      </button>
    </li>
  );
}

function MenuList({
  title,
  options,
  onSelect,
  onBack,
}: {
  title: string;
  options: { id: number; label: string; active: boolean }[];
  onSelect: (id: number) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left font-semibold text-foreground hover:bg-white/10"
      >
        ‹ {title}
      </button>
      <ul className="max-h-60 overflow-auto">
        {options.map((o) => (
          <li key={o.id}>
            <button
              onClick={() => onSelect(o.id)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/10 ${
                o.active ? "text-primary" : "text-foreground"
              }`}
            >
              {o.label}
              {o.active && <span className="text-primary">●</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
