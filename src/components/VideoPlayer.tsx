"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Plus, 
  Settings, 
  Share2, 
  Heart, 
  Check, 
  ChevronDown, 
  Tv, 
  Sparkles,
  ArrowRight,
  HelpCircle,
  Undo2
} from "lucide-react";
import Hls from "hls.js";

interface VideoPlayerProps {
  mediaType: "movie" | "tv";
  id: string;
  imdbId?: string;
  title: string;
  season?: number;
  episode?: number;
  onEpisodeChange?: (episode: number) => void;
  totalEpisodes?: number;
  episodesList?: any[];
  onSeasonChange?: (season: number) => void;
  seasonsList?: any[];
  // Redesign props
  posterUrl?: string;
  episodeTitle?: string;
  episodeRuntime?: number;
}

interface ServerConfig {
  id: number;
  name: string;
  status: string;
  dub: string;
}

export default function VideoPlayer({
  mediaType,
  id,
  imdbId,
  title,
  season = 1,
  episode = 1,
  onEpisodeChange,
  totalEpisodes = 999,
  episodesList = [],
  onSeasonChange,
  seasonsList = [],
  posterUrl = "",
  episodeTitle = "",
  episodeRuntime = 24
}: VideoPlayerProps) {
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamSources, setStreamSources] = useState<any[]>([]);
  const [captions, setCaptions] = useState<any[]>([]);
  const [currentStreamUrl, setCurrentStreamUrl] = useState("");
  const [activeSubtitle, setActiveSubtitle] = useState("");
  const [activeResolution, setActiveResolution] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<number>(0);
  const [hasClickedPlay, setHasClickedPlay] = useState(false);
  const [useBackupPlayer, setUseBackupPlayer] = useState(false);

  const isPhpDeploy = typeof window !== 'undefined' && 
    (window.location.hostname.includes('gr.tc') || window.location.hostname.includes('infinityfree'));
  
  // Playback settings
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [dimLights, setDimLights] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Dropdown open states
  const [isServerOpen, setIsServerOpen] = useState(false);
  const [isSubtitleOpen, setIsSubtitleOpen] = useState(false);
  const [isPlaybackMenuOpen, setIsPlaybackMenuOpen] = useState(false);

  const [availableServers, setAvailableServers] = useState<ServerConfig[]>([
    { id: 0, name: "Plexoria Server (SUB / Multi-Language)", status: "active", dub: "" },
    { id: 200, name: "Plexoria Server (Hindi Dubbed)", status: "active", dub: "hindi" }
  ]);

  // Reset play gesture trigger on episode/show change
  useEffect(() => {
    setHasClickedPlay(false);
    setSelectedServerId(0);
    setUseBackupPlayer(false);
    setAvailableServers([
      { id: 0, name: "Plexoria Server (SUB / Multi-Language)", status: "active", dub: "" },
      { id: 200, name: "Plexoria Server (Hindi Dubbed)", status: "active", dub: "hindi" }
    ]);
  }, [mediaType, id, season, episode]);

  // Fetch MovieBox Streams when servers or episodes change
  useEffect(() => {
    let isMounted = true;
    const fetchMovieBoxStreams = async () => {
      setIsLoadingStream(true);
      setStreamError(null);
      try {
        const currentServer = availableServers.find(s => s.id === selectedServerId) || availableServers[0];
        const dubParam = currentServer ? currentServer.dub : "";
        const res = await fetch(
          isPhpDeploy
            ? `/api/moviebox/play/index.php?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}`
            : `/api/moviebox/play?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}`
        );
        if (!res.ok) {
          throw new Error("Failed to load Plexoria stream index");
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const availableStreams = [
          ...(data.streams || []),
          ...(data.hls || []),
          ...(data.dash || [])
        ].filter((s: any) => !s.vipLocked && s.url);

        if (availableStreams.length === 0) {
          throw new Error("No free streaming sources available for this title");
        }

        if (!isMounted) return;

        setStreamSources(availableStreams);
        setCaptions(data.captions || []);

        if (data.availableDubs && data.availableDubs.length > 0) {
          setAvailableServers(data.availableDubs.map((d: any) => ({
            id: d.id,
            name: d.name,
            status: "active",
            dub: d.dub
          })));
        }

        const sorted = availableStreams.sort((a: any, b: any) => {
          const resA = parseInt(a.resolution) || 0;
          const resB = parseInt(b.resolution) || 0;
          return resB - resA;
        });

        const highest = sorted[0];
        const proxiedUrl = highest.url.startsWith("http")
          ? (isPhpDeploy
              ? `/api/moviebox/proxy-stream/index.php?url=${encodeURIComponent(highest.url)}`
              : `/api/moviebox/proxy-stream?url=${encodeURIComponent(highest.url)}`)
          : highest.url;
        setCurrentStreamUrl(proxiedUrl);
        setActiveResolution(highest.resolution);

        if (data.captions && data.captions.length > 0) {
          const engSub = data.captions.find((c: any) => 
            c.languageCode.toLowerCase() === "en" || c.language.toLowerCase().includes("english")
          );
          const hinSub = data.captions.find((c: any) => 
            c.languageCode.toLowerCase() === "hi" || c.language.toLowerCase().includes("hindi")
          );
          const defaultSub = engSub || hinSub || data.captions[0];
          setActiveSubtitle(defaultSub.url);
        } else {
          setActiveSubtitle("");
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setStreamError(err.message || "Failed to resolve streams.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingStream(false);
        }
      }
    };

    fetchMovieBoxStreams();
    return () => {
      isMounted = false;
    };
  }, [selectedServerId, season, episode, title, mediaType]);

  const handleNextEpisode = () => {
    if (onEpisodeChange && episode < totalEpisodes) {
      onEpisodeChange(episode + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (onEpisodeChange && episode > 1) {
      onEpisodeChange(episode - 1);
    }
  };

  const selectedServer = availableServers.find(s => s.id === selectedServerId) || availableServers[0];

  return (
    <div className="w-full flex flex-col gap-4 relative z-20">
      
      {/* Dim Lights Overlay */}
      {dimLights && (
        <div className="fixed inset-0 bg-black/95 z-40 pointer-events-none transition-opacity duration-500" />
      )}

      {/* Main Video Player Container (Netflix-style rounded corners) */}
      <div 
        className="w-full aspect-video bg-black rounded-[20px] border border-white/10 overflow-hidden shadow-2xl relative z-40"
        style={{ boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}
      >
        {/* Poster Still Background when player is idle / hasn't clicked play */}
        {!hasClickedPlay && (
          <div 
            onClick={() => setHasClickedPlay(true)}
            className="absolute inset-0 z-30 cursor-pointer overflow-hidden flex flex-col items-center justify-center group"
          >
            {posterUrl ? (
              <>
                <img 
                  src={posterUrl} 
                  alt={title} 
                  className="absolute inset-0 w-full h-full object-cover filter blur-[2px] opacity-40 scale-102 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 z-10" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] to-[#12121A] z-10" />
            )}

            {/* Play Button Overlay */}
            <div className="relative z-20 flex flex-col items-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-110 active:scale-95">
                <Play size={26} className="fill-current ml-1" />
              </div>
              
              <h2 className="text-white font-bold text-lg md:text-xl mt-5 tracking-wide max-w-xl group-hover:text-red-400 transition-colors">
                {mediaType === "tv" ? `Play Episode ${episode}` : `Stream "${title}"`}
              </h2>
              
              <p className="text-xs text-gray-400 font-semibold mt-2.5 flex items-center gap-2">
                <span>{mediaType === "tv" ? `Season ${season} • Episode ${episode}` : "Movie"}</span>
                <span>•</span>
                <span>${episodeRuntime} min</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold text-white uppercase font-sans">HD</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold text-white uppercase font-sans">Sub</span>
              </p>

              {episodeTitle && (
                <p className="text-xs text-[#E50914] font-medium mt-1">
                  "{episodeTitle}"
                </p>
              )}
            </div>
          </div>
        )}

        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {isLoadingStream ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-[#E50914]/20 border-t-[#E50914] animate-spin"></div>
              <span className="text-xs text-gray-400 font-semibold">Resolving secure streams...</span>
            </div>
          ) : useBackupPlayer ? (
            <div className="relative w-full h-full">
              <iframe 
                src={mediaType === "movie" ? `https://vidlink.pro/embed/movie/${id}` : `https://vidlink.pro/embed/tv/${id}/${season}/${episode}`}
                className="w-full h-full border-0" 
                allowFullScreen 
                allow="autoplay; encrypted-media; picture-in-picture"
                title={`${title} - Backup Player`}
              ></iframe>
              <button 
                onClick={() => setUseBackupPlayer(false)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5 backdrop-blur shadow-lg transition-all"
              >
                <Undo2 size={12} /> Switch back to Plexoria Server
              </button>
            </div>
          ) : streamError ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center p-6 gap-4">
              <div className="text-center space-y-1 max-w-sm">
                <span className="text-[#E50914] text-[10px] font-extrabold font-mono tracking-widest uppercase block mb-1">Streaming Alert</span>
                <h3 className="text-sm font-bold text-white">Stream currently unavailable</h3>
                <p className="text-[11px] text-gray-400 leading-normal font-medium">
                  {streamError || "MovieBox failed to resolve the media streaming source. Please try again later or refresh the page."}
                </p>
              </div>
              <button
                onClick={() => setUseBackupPlayer(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#B91C1C] text-xs font-bold text-white shadow-lg hover:shadow-red-500/10 transition-all hover:scale-103 duration-300 flex items-center gap-2"
              >
                <Play size={13} className="fill-current" /> Play from Backup Server
              </button>
            </div>
          ) : (
            hasClickedPlay && currentStreamUrl ? (
              <CustomPlayer
                url={currentStreamUrl}
                captions={captions}
                activeSubtitle={activeSubtitle}
                onSubtitleChange={setActiveSubtitle}
                resolutions={streamSources}
                activeResolution={activeResolution}
                onResolutionChange={(resObj: any) => {
                  const proxied = resObj.url.startsWith("http")
                    ? (isPhpDeploy
                        ? `/api/moviebox/proxy-stream/index.php?url=${encodeURIComponent(resObj.url)}`
                        : `/api/moviebox/proxy-stream?url=${encodeURIComponent(resObj.url)}`)
                    : resObj.url;
                  setCurrentStreamUrl(proxied);
                  setActiveResolution(resObj.resolution);
                }}
                autoPlay={autoPlay}
                autoNext={autoNext}
                playbackSpeed={playbackSpeed}
                mediaId={id}
                season={season}
                episode={episode}
                onEnded={handleNextEpisode}
              />
            ) : (
              <div className="text-gray-500 text-xs">Ready to Stream</div>
            )
          )}
        </div>
      </div>

      {/* Unified Playback Controls & Settings Bar (Netflix + Plex look) */}
      <div 
        className="flex flex-wrap items-center justify-between gap-4 bg-[#171717] border border-white/5 p-4 rounded-xl shadow-lg text-xs text-gray-300 relative z-40"
        style={{ borderRadius: "14px" }}
      >
        
        {/* Dropdowns on the left */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Server / Dub selection */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsServerOpen(!isServerOpen);
                setIsSubtitleOpen(false);
                setIsPlaybackMenuOpen(false);
              }}
              className="h-10 px-4 bg-[#1E1E1E] hover:bg-[#242424] text-white font-semibold rounded-[12px] flex items-center gap-2 border border-white/5 transition-colors cursor-pointer"
            >
              <span>Server: {selectedServer.dub === "hindi" ? "Hindi DUB" : "English SUB"}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isServerOpen && (
              <div className="absolute left-0 bottom-12 mb-1 w-64 bg-[#171717] border border-white/10 rounded-[14px] p-1.5 flex flex-col gap-0.5 shadow-2xl z-50">
                {availableServers.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      setSelectedServerId(srv.id);
                      setIsServerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-colors ${
                      srv.id === selectedServerId 
                        ? "bg-[#E50914]/10 text-[#E50914]" 
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{srv.dub === "hindi" ? "🎙 Hindi Dubbed" : "🎬 Subtitled (English/Multi)"}</span>
                    {srv.id === selectedServerId && <Check size={12} className="text-[#E50914]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtitles (CC) selection */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsSubtitleOpen(!isSubtitleOpen);
                setIsServerOpen(false);
                setIsPlaybackMenuOpen(false);
              }}
              className="h-10 px-4 bg-[#1E1E1E] hover:bg-[#242424] text-white font-semibold rounded-[12px] flex items-center gap-2 border border-white/5 transition-colors cursor-pointer"
            >
              <span>Subtitles: {activeSubtitle ? "On" : "Off"}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isSubtitleOpen && (
              <div className="absolute left-0 bottom-12 mb-1 w-48 bg-[#171717] border border-white/10 rounded-[14px] p-1.5 flex flex-col gap-0.5 shadow-2xl max-h-48 overflow-y-auto z-50">
                <button
                  onClick={() => {
                    setActiveSubtitle("");
                    setIsSubtitleOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold ${
                    !activeSubtitle 
                      ? "bg-[#E50914]/10 text-[#E50914]" 
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>Off</span>
                  {!activeSubtitle && <Check size={12} className="text-[#E50914]" />}
                </button>
                {captions.map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => {
                      setActiveSubtitle(cap.url);
                      setIsSubtitleOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold ${
                      cap.url === activeSubtitle 
                        ? "bg-[#E50914]/10 text-[#E50914]" 
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{cap.language}</span>
                    {cap.url === activeSubtitle && <Check size={12} className="text-[#E50914]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ⚙ Playback settings menu */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsPlaybackMenuOpen(!isPlaybackMenuOpen);
                setIsServerOpen(false);
                setIsSubtitleOpen(false);
              }}
              className="h-10 px-4 bg-[#1E1E1E] hover:bg-[#242424] text-white font-semibold rounded-[12px] flex items-center gap-2 border border-white/5 transition-colors cursor-pointer"
            >
              <Settings size={14} className="text-gray-400" />
              <span>⚙ Playback</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isPlaybackMenuOpen && (
              <div className="absolute left-0 bottom-12 mb-1 w-64 bg-[#171717] border border-white/10 rounded-[14px] p-3 flex flex-col gap-3 shadow-2xl z-50">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider border-b border-white/5 pb-1">Playback Settings</span>
                
                <label className="flex items-center justify-between cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                  <span>Auto Play Next Episode</span>
                  <input 
                    type="checkbox" 
                    checked={autoPlay} 
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="accent-[#E50914] rounded border-white/10 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                  <span>Auto Next Episode (Ended)</span>
                  <input 
                    type="checkbox" 
                    checked={autoNext} 
                    onChange={(e) => setAutoNext(e.target.checked)}
                    className="accent-[#E50914] rounded border-white/10 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                  <span>Dim Lights Background</span>
                  <input 
                    type="checkbox" 
                    checked={dimLights} 
                    onChange={(e) => setDimLights(e.target.checked)}
                    className="accent-[#E50914] rounded border-white/10 w-4 h-4 cursor-pointer"
                  />
                </label>

                <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Speed:</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => {
                          setPlaybackSpeed(spd);
                          setIsPlaybackMenuOpen(false);
                        }}
                        className={`flex-1 py-1 rounded text-[10px] font-bold text-center border transition-all ${
                          playbackSpeed === spd 
                            ? "bg-[#E50914] border-[#E50914] text-white" 
                            : "bg-[#1E1E1E] border-white/5 hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons on the right */}
        <div className="flex items-center gap-2">

          {mediaType === "tv" && (
            <>
              <button 
                onClick={handlePrevEpisode}
                disabled={episode <= 1}
                className="h-10 px-4 bg-[#1E1E1E] hover:bg-[#242424] text-white font-semibold rounded-[12px] flex items-center gap-1 border border-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <span>⏮ Prev</span>
              </button>
              <button 
                onClick={handleNextEpisode}
                disabled={episode >= totalEpisodes}
                className="h-10 px-4 bg-[#E50914] hover:bg-[#b0070f] text-white font-bold rounded-[12px] flex items-center gap-1 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <span>Next Episode →</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 🎬 CustomPlayer Video Controls (hls.js integration)
// ────────────────────────────────────────────────────────────────────────
interface CustomPlayerProps {
  url: string;
  captions: any[];
  activeSubtitle: string;
  onSubtitleChange: (url: string) => void;
  resolutions: any[];
  activeResolution: string;
  onResolutionChange: (res: any) => void;
  autoPlay: boolean;
  autoNext: boolean;
  playbackSpeed: number;
  mediaId: string;
  season: number;
  episode: number;
  onEnded: () => void;
}

function CustomPlayer({
  url,
  captions,
  activeSubtitle,
  onSubtitleChange,
  resolutions,
  activeResolution,
  onResolutionChange,
  autoPlay,
  autoNext,
  playbackSpeed,
  mediaId,
  season,
  episode,
  onEnded
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isSubtitleOpen, setIsSubtitleOpen] = useState(false);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Load stream with HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    let hls: Hls | null = null;

    if (url.includes(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 30,
          enableWorker: true
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        if (autoPlay) {
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    } else {
      video.src = url;
      if (autoPlay) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, autoPlay]);

  // Save progress percentage to localStorage
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);

    // Save watched progress to localStorage
    const dur = video.duration || duration;
    if (dur > 0) {
      const percentage = Math.round((cur / dur) * 100);
      try {
        const stored = localStorage.getItem("plexoria_watched_progress") || "{}";
        const progressMap = JSON.parse(stored);
        const key = `${mediaId}_${season}_${episode}`;
        
        // Only save if it's substantial, and delete if ended
        if (percentage > 95) {
          progressMap[key] = 100;
        } else if (percentage > 1) {
          progressMap[key] = percentage;
        }
        localStorage.setItem("plexoria_watched_progress", JSON.stringify(progressMap));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Hide controls on inactivity
  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, isPlaying]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error(err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen failed:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext && onEnded) {
      onEnded();
    }
  };

  return (
    <div 
      className="relative w-full h-full group/player overflow-hidden flex items-center justify-center bg-black"
      onMouseMove={() => {
        setShowControls(true);
      }}
    >
      {/* Big Play Button Overlay in center when paused */}
      {!isPlaying && (
        <div 
          onClick={handlePlayPause}
          className="absolute w-16 h-16 rounded-full bg-black/60 hover:bg-[#E50914]/90 text-white flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 z-30 transform hover:scale-110 active:scale-95"
        >
          <Play size={26} className="fill-current ml-0.5" />
        </div>
      )}
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onClick={handlePlayPause}
        className="w-full h-full object-contain cursor-pointer"
      >
        {activeSubtitle && (
          <track
            kind="subtitles"
            src={activeSubtitle}
            srcLang="en"
            label="Active Subtitle"
            default
          />
        )}
      </video>

      {/* Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] font-mono text-gray-300 font-bold">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-[#E50914] h-1 bg-white/20 rounded-lg cursor-pointer hover:h-1.5 transition-all"
          />
          <span className="text-[10px] font-mono text-gray-300 font-bold">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between w-full text-white">
          <div className="flex items-center gap-4">
            <button onClick={handlePlayPause} className="hover:text-[#E50914] transition-colors text-base font-bold">
              {isPlaying ? "⏸" : "▶"}
            </button>
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-[#E50914] transition-colors text-base">
                {isMuted ? "🔇" : "🔊"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-16 h-1 accent-[#E50914] bg-white/20 rounded-lg cursor-pointer transition-all duration-300 overflow-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* Quality Selector */}
            <div className="relative">
              <button 
                onClick={() => { setIsResolutionOpen(!isResolutionOpen); setIsSubtitleOpen(false); }}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 uppercase tracking-wide text-[10px]"
              >
                ⚙ {activeResolution}
              </button>
              {isResolutionOpen && (
                <div className="absolute bottom-8 right-0 bg-[#0A0A0F]/95 border border-white/10 rounded-lg py-1.5 w-24 flex flex-col gap-0.5 shadow-2xl z-50 text-[10px]">
                  {resolutions.map((res: any) => (
                    <button
                      key={res.resolution}
                      onClick={() => {
                        onResolutionChange(res);
                        setIsResolutionOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors ${
                        res.resolution === activeResolution ? "text-[#E50914] font-extrabold" : "text-gray-300"
                      }`}
                    >
                      {res.resolution}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitle Selector */}
            <div className="relative">
              <button 
                onClick={() => { setIsSubtitleOpen(!isSubtitleOpen); setIsResolutionOpen(false); }}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 uppercase tracking-wide text-[10px]"
              >
                💬 CC
              </button>
              {isSubtitleOpen && (
                <div className="absolute bottom-8 right-0 bg-[#0A0A0F]/95 border border-white/10 rounded-lg py-1.5 w-32 max-h-36 overflow-y-auto flex flex-col gap-0.5 shadow-2xl z-50 text-[10px]">
                  <button
                    onClick={() => {
                      onSubtitleChange("");
                      setIsSubtitleOpen(false);
                    }}
                    className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors ${
                      !activeSubtitle ? "text-[#E50914] font-extrabold" : "text-gray-300"
                    }`}
                  >
                    Off
                  </button>
                  {captions.map((cap: any) => (
                    <button
                      key={cap.id}
                      onClick={() => {
                        onSubtitleChange(cap.url);
                        setIsSubtitleOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors ${
                        cap.url === activeSubtitle ? "text-[#E50914] font-extrabold" : "text-gray-300"
                      }`}
                    >
                      {cap.language}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="hover:text-[#E50914] transition-colors text-sm">
              🗖
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
