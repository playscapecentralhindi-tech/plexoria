"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause,
  Volume2, 
  VolumeX, 
  Maximize2, 
  Plus, 
  Settings, 
  Share2, 
  Heart, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Tv, 
  Sparkles,
  ArrowRight,
  HelpCircle,
  Undo2,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Clock,
  Subtitles,
  Volume1,
  Sun,
  Loader2
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

  // Episode Search state
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [availableServers, setAvailableServers] = useState<ServerConfig[]>([
    { id: 0, name: "Plexoria Server (SUB / Multi-Language)", status: "active", dub: "" },
    { id: 200, name: "Plexoria Server (Hindi Dubbed)", status: "active", dub: "hindi" }
  ]);

  // Reset play gesture trigger on episode/show change
  useEffect(() => {
    setHasClickedPlay(false);
    setSelectedServerId(0);
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
            ? `/api/moviebox/play/index.php?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}&imdbId=${encodeURIComponent(imdbId || "")}&_t=${Date.now()}`
            : `/api/moviebox/play?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}&imdbId=${encodeURIComponent(imdbId || "")}&_t=${Date.now()}`
        );
        if (!res.ok) {
          let errMsg = "Failed to load Plexoria stream index";
          try {
            const errJson = await res.json();
            if (errJson) {
              errMsg = errJson.details || errJson.error || errMsg;
            }
          } catch (e) {}
          throw new Error(errMsg);
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const availableStreams = [
          ...(data.streams || []),
          ...(data.hls || [])
        ].filter((s: any) => s.url);

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
        console.error("MovieBox stream resolver failed:", err);
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

  // Generate list of Next Episodes, Search Matches, and Recently Watched
  const nextEpisodes = episodesList
    .filter((ep: any) => ep.episode_number > episode)
    .slice(0, 3);

  // Read recently watched episodes from local progress Map
  const [recentEpisodes, setRecentEpisodes] = useState<any[]>([]);

  useEffect(() => {
    if (mediaType === "tv") {
      try {
        const stored = localStorage.getItem("plexoria_watched_progress") || "{}";
        const progressMap = JSON.parse(stored);
        
        // Find watched episodes for this tv show from the current season
        const watched = episodesList.filter((ep: any) => {
          const key = `${id}_${season}_${ep.episode_number}`;
          // consider watched if it exists in progress map
          return progressMap[key] !== undefined && ep.episode_number !== episode;
        }).slice(0, 3);
        setRecentEpisodes(watched);
      } catch (e) {
        console.error(e);
      }
    }
  }, [episodesList, episode, mediaType, id, season, isSearchFocused]);

  // Matches based on search query
  const matchingEpisodes = episodeSearchQuery.trim()
    ? episodesList.filter((ep: any) => {
        const q = episodeSearchQuery.toLowerCase();
        const epNumStr = ep.episode_number.toString();
        const epName = (ep.name || "").toLowerCase();
        return epNumStr === q || epNumStr.includes(q) || epName.includes(q);
      })
    : [];

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
                <span>{episodeRuntime} min</span>
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
          ) : streamError ? (
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center p-6 gap-4">
              <div className="text-center space-y-1 max-w-sm">
                <span className="text-[#E50914] text-[10px] font-extrabold font-mono tracking-widest uppercase block mb-1">Streaming Alert</span>
                <h3 className="text-sm font-bold text-white">Stream currently unavailable</h3>
                <p className="text-[11px] text-gray-400 leading-normal font-medium">
                  {streamError || "MovieBox failed to resolve the media streaming source. Please try again later or refresh the page."}
                </p>
              </div>
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
                onSpeedChange={setPlaybackSpeed}
                mediaId={id}
                mediaTitle={title}
                mediaType={mediaType}
                season={season}
                episode={episode}
                onEnded={handleNextEpisode}
                posterUrl={posterUrl}
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
              <div className="absolute left-0 bottom-12 mb-1 w-64 bg-[#171717]/95 backdrop-blur-md border border-white/10 rounded-[14px] p-1.5 flex flex-col gap-0.5 shadow-2xl z-50">
                <span className="px-2.5 py-1 text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">HLS Streams</span>
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

        {/* Episode Search / Jump Widget (TV shows only) */}
        {mediaType === "tv" && (
          <div ref={searchContainerRef} className="relative flex-1 max-w-sm min-w-[200px] z-50">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[11px] text-gray-500">
                🔍
              </span>
              <input
                type="text"
                value={episodeSearchQuery}
                onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setIsServerOpen(false);
                  setIsSubtitleOpen(false);
                  setIsPlaybackMenuOpen(false);
                }}
                placeholder="Search or Jump to Episode... [e.g., '12' or 'final']"
                className="w-full h-10 pl-9 pr-4 bg-[#1E1E1E] hover:bg-[#242424] focus:bg-[#242424] text-white font-semibold rounded-[12px] border border-white/5 focus:border-[#E50914]/50 focus:outline-none transition-all placeholder-gray-500 text-xs"
              />
            </div>

            {isSearchFocused && (
              <div className="absolute left-0 bottom-12 mb-1 w-full bg-[#171717]/95 backdrop-blur-md border border-white/10 rounded-[14px] p-2 flex flex-col gap-2 shadow-2xl max-h-72 overflow-y-auto z-50">
                
                {/* Search Active Matching Mode */}
                {episodeSearchQuery.trim() ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="px-2 py-1 text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Matches</span>
                    {matchingEpisodes.length > 0 ? (
                      matchingEpisodes.map((ep: any) => (
                        <button
                          key={ep.id}
                          onClick={() => {
                            if (onEpisodeChange) onEpisodeChange(ep.episode_number);
                            setEpisodeSearchQuery("");
                            setIsSearchFocused(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold hover:bg-white/5 transition-colors ${
                            ep.episode_number === episode ? "text-[#E50914]" : "text-gray-300"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] shrink-0 font-bold">
                            {ep.episode_number}
                          </span>
                          <span className="truncate">{ep.name || `Episode ${ep.episode_number}`}</span>
                        </button>
                      ))
                    ) : (
                      <span className="px-2.5 py-2 text-[10px] text-gray-500 italic">No matching episodes found</span>
                    )}
                  </div>
                ) : (
                  /* Default list when search is empty */
                  <>
                    {/* Next Episodes */}
                    {nextEpisodes.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <span className="px-2 py-1 text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Next Episodes</span>
                        {nextEpisodes.map((ep: any) => (
                          <button
                            key={ep.id}
                            onClick={() => {
                              if (onEpisodeChange) onEpisodeChange(ep.episode_number);
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-gray-300 hover:bg-white/5 transition-colors group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] shrink-0 text-gray-400 group-hover:text-white font-bold">
                                {ep.episode_number}
                              </span>
                              <span className="truncate">{ep.name || `Episode ${ep.episode_number}`}</span>
                            </div>
                            <span className="text-gray-500 group-hover:text-white shrink-0 ml-2">›</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recently Watched */}
                    {recentEpisodes.length > 0 && (
                      <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1.5">
                        <span className="px-2 py-1 text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Recently Watched</span>
                        {recentEpisodes.map((ep: any) => (
                          <button
                            key={ep.id}
                            onClick={() => {
                              if (onEpisodeChange) onEpisodeChange(ep.episode_number);
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <span className="text-[11px] shrink-0">🕒</span>
                            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] shrink-0 font-bold">
                              {ep.episode_number}
                            </span>
                            <span className="truncate">{ep.name || `Episode ${ep.episode_number}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
  onSpeedChange?: (speed: number) => void;
  mediaId: string;
  mediaTitle?: string;
  mediaType?: "movie" | "tv";
  season: number;
  episode: number;
  onEnded: () => void;
  posterUrl?: string;
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
  onSpeedChange,
  mediaId,
  mediaTitle = "",
  mediaType = "movie",
  season,
  episode,
  onEnded,
  posterUrl = ""
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Settings menu states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"main" | "speed" | "quality" | "subtitle" | "sleep" | null>(null);
  
  // Custom HUD and Overlay indicators
  const [hudText, setHudText] = useState<string | null>(null);
  const [hudIcon, setHudIcon] = useState<string | null>(null);
  const [showHud, setShowHud] = useState(false);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Gesture states
  const [doubleTapLeft, setDoubleTapLeft] = useState(false);
  const [doubleTapRight, setDoubleTapRight] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

  // Scrubber hover preview
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverXPercent, setHoverXPercent] = useState(0);
  const [showHoverTime, setShowHoverTime] = useState(false);
  const [hoverChapterName, setHoverChapterName] = useState("");
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([]);
  const [speedIndicatorVal, setSpeedIndicatorVal] = useState<number | null>(null);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [showScrubIndicator, setShowScrubIndicator] = useState(false);

  // Mobile Lock controls
  const [isLocked, setIsLocked] = useState(false);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const lockPromptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Picture in Picture
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Aspect ratio fit mode (fit / cover / fill)
  const [fitMode, setFitMode] = useState<"contain" | "cover" | "fill">("contain");

  // Sleep Timer states
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Loading state
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Auto Next countdown state
  const [showNextCountdown, setShowNextCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(20);
  const [ignoreCountdown, setIgnoreCountdown] = useState(false);

  // Gesture & timers refs
  const touchStartRef = useRef<{ x: number; y: number; time: number; scrubTime: number } | null>(null);
  const touchTypeRef = useRef<"brightness" | "volume" | "scrub" | null>(null);
  const initialValRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredProgressRef = useRef(false);

  // Chapters computation
  const chaptersList = [
    { name: "Intro", start: 0, end: duration * 0.1 },
    { name: "Opening", start: duration * 0.1, end: duration * 0.18 },
    { name: "Climax / Story", start: duration * 0.18, end: duration * 0.85 },
    { name: "Ending Credits", start: duration * 0.85, end: duration }
  ];

  // Format time utility helper
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // HUD notification trigger
  const triggerHud = (icon: string, text: string) => {
    setHudIcon(icon);
    setHudText(text);
    setShowHud(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setShowHud(false);
    }, 1000);
  };

  // Apply playback speed rate
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
    setIsVideoLoaded(false);
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

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    setShowNextCountdown(false);
    setIgnoreCountdown(false);
  }, [url]);

  // Sleep Timer Handler
  useEffect(() => {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    if (sleepTimerMinutes !== null && isPlaying) {
      let timeLeft = sleepTimerMinutes * 60;
      sleepTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
          setSleepTimerMinutes(null);
          triggerHud("⏸", "Sleep Timer Paused Video");
          clearInterval(sleepTimerRef.current!);
        }
      }, 1000);
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimerMinutes, isPlaying]);

  // Time update progress & buffered tracking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);

    // Track buffering ranges
    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: (video.buffered.start(i) / (video.duration || 1)) * 100,
        end: (video.buffered.end(i) / (video.duration || 1)) * 100
      });
    }
    setBufferedRanges(ranges);

    const dur = video.duration || duration;
    if (dur > 0) {
      const percentage = Math.round((cur / dur) * 100);
      try {
        const storedProgress = localStorage.getItem("plexoria_watched_progress") || "{}";
        const progressMap = JSON.parse(storedProgress);
        const key = `${mediaId}_${season}_${episode}`;
        
        if (percentage > 95) {
          progressMap[key] = 100;
        } else if (percentage > 1) {
          progressMap[key] = percentage;
        }
        localStorage.setItem("plexoria_watched_progress", JSON.stringify(progressMap));

        const storedStates = localStorage.getItem("plexoria_playback_states") || "{}";
        const playbackStates = JSON.parse(storedStates);
        playbackStates[key] = {
          timestamp: cur,
          progress: percentage,
          quality: activeResolution,
          speed: playbackSpeed,
          subtitle: activeSubtitle,
          updatedAt: Date.now(),
          mediaId: mediaId,
          mediaTitle: mediaTitle,
          mediaType: mediaType,
          season: season,
          episode: episode,
          posterUrl: posterUrl
        };
        localStorage.setItem("plexoria_playback_states", JSON.stringify(playbackStates));
      } catch (e) {
        console.error(e);
      }

      // Next Episode countdown card trigger
      const timeRemaining = dur - cur;
      if (dur > 60 && timeRemaining <= 20 && timeRemaining > 0.5 && !ignoreCountdown && autoNext) {
        setShowNextCountdown(true);
        setCountdownSeconds(Math.ceil(timeRemaining));
      } else {
        setShowNextCountdown(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);

    if (!hasRestoredProgressRef.current) {
      try {
        const key = `${mediaId}_${season}_${episode}`;
        const storedStates = localStorage.getItem("plexoria_playback_states") || "{}";
        const playbackStates = JSON.parse(storedStates);
        const savedState = playbackStates[key];

        if (savedState && savedState.timestamp > 2) {
          console.log(`[Resume Playback] Restoring position to ${savedState.timestamp}s`);
          video.currentTime = savedState.timestamp;
          setCurrentTime(savedState.timestamp);
        }
      } catch (e) {
        console.error(e);
      }
      hasRestoredProgressRef.current = true;
    }
  };

  // Hide controls on inactivity
  useEffect(() => {
    if (showControls && isPlaying && !isLocked) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setIsSettingsOpen(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, isPlaying, isLocked]);

  const handlePlayPause = () => {
    if (isLocked) {
      triggerLockPrompt();
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      triggerHud("⏸", "Paused");
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        triggerHud("▶", "Playing");
      }).catch(err => console.error(err));
    }
  };

  // Drag Seek
  const handleSeekChange = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
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
    triggerHud(nextMuted ? "🔇" : "🔊", nextMuted ? "Muted" : `${Math.round(volume * 100)}%`);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    triggerHud(nextLocked ? "🔒" : "🔓", nextLocked ? "Controls Locked" : "Controls Unlocked");
    if (nextLocked) {
      setShowControls(false);
    } else {
      setShowControls(true);
    }
  };

  const triggerLockPrompt = () => {
    setShowLockPrompt(true);
    if (lockPromptTimeoutRef.current) clearTimeout(lockPromptTimeoutRef.current);
    lockPromptTimeoutRef.current = setTimeout(() => {
      setShowLockPrompt(false);
    }, 2000);
  };

  // Picture in Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (e) {
      console.error(e);
      triggerHud("📺", "PiP Unsupported");
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoNext && onEnded) {
      onEnded();
    }
  };

  // Click handler wrapper supporting single tap controls and double tap seeks
  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked) {
      triggerLockPrompt();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    if (e.detail === 2) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      const video = videoRef.current;
      if (!video) return;

      if (isLeft) {
        video.currentTime = Math.max(0, video.currentTime - 5);
        setDoubleTapLeft(true);
        setTimeout(() => setDoubleTapLeft(false), 500);
        triggerHud("⏪", "-5 Seconds");
      } else {
        video.currentTime = Math.min(video.duration || 99999, video.currentTime + 5);
        setDoubleTapRight(true);
        setTimeout(() => setDoubleTapRight(false), 500);
        triggerHud("⏩", "+5 Seconds");
      }
    } else {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        setShowControls(prev => !prev);
      }, 260);
    }
  };

  // Long press for temporary 2x speed controls
  const handleMouseDown = () => {
    if (isLocked) return;
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = 2.0;
        setLongPressActive(true);
        triggerHud("⚡", "2X Speed Holding");
      }
    }, 450);
  };

  const handleMouseUp = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (longPressActive) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = playbackSpeed;
      }
      setLongPressActive(false);
      triggerHud("⚡", `${playbackSpeed}x Speed`);
    }
  };

  // Fullscreen touch swipe handler (brightness, volume, and scrub)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, time: Date.now(), scrubTime: currentTime };

    if (!isFullscreen) {
      touchTypeRef.current = "scrub";
      initialValRef.current = currentTime;
    } else {
      if (x < rect.width / 2) {
        touchTypeRef.current = "brightness";
        initialValRef.current = brightness;
      } else {
        touchTypeRef.current = "volume";
        initialValRef.current = volume;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked || !touchStartRef.current || !touchTypeRef.current) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const deltaX = x - touchStartRef.current.x;
    const deltaY = touchStartRef.current.y - y;

    if (touchTypeRef.current === "scrub" || (!isFullscreen && Math.abs(deltaX) > Math.abs(deltaY) * 1.5)) {
      touchTypeRef.current = "scrub";
      const scrubRatio = deltaX / rect.width;
      const scrubRange = Math.min(600, duration || 100);
      const targetScrubTime = Math.min(duration || 100, Math.max(0, touchStartRef.current.scrubTime + scrubRatio * scrubRange));
      setScrubPreviewTime(targetScrubTime);
      setShowScrubIndicator(true);
      return;
    }

    if (!isFullscreen) return;

    const percentChange = deltaY / rect.height;
    if (touchTypeRef.current === "brightness") {
      const newVal = Math.min(1.0, Math.max(0.1, initialValRef.current + percentChange));
      setBrightness(newVal);
      setShowBrightnessIndicator(true);
    } else if (touchTypeRef.current === "volume") {
      const video = videoRef.current;
      if (video) {
        const newVal = Math.min(1.0, Math.max(0.0, initialValRef.current + percentChange));
        video.volume = newVal;
        setVolume(newVal);
        setIsMuted(newVal === 0);
        setShowVolumeIndicator(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTypeRef.current === "scrub" && scrubPreviewTime !== null) {
      handleSeekChange(scrubPreviewTime);
      setScrubPreviewTime(null);
      setShowScrubIndicator(false);
    }

    setTimeout(() => {
      setShowBrightnessIndicator(false);
      setShowVolumeIndicator(false);
    }, 800);
    touchStartRef.current = null;
    touchTypeRef.current = null;
  };

  // Mouse wheel volume controls
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const video = videoRef.current;
    if (!video) return;

    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVolume = Math.min(1.0, Math.max(0.0, video.volume + delta));
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    triggerHud("🔊", `${Math.round(newVolume * 100)}%`);
  };

  // Handle aspect ratio toggle
  const handlePinchGesture = () => {
    if (isLocked) return;
    const modes: ("contain" | "cover" | "fill")[] = ["contain", "cover", "fill"];
    const curIndex = modes.indexOf(fitMode);
    const nextMode = modes[(curIndex + 1) % modes.length];
    setFitMode(nextMode);
    triggerHud("📺", `Fit: ${nextMode.toUpperCase()}`);
  };

  // Progress Bar Scroller Hover details
  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverRatio = Math.min(1, Math.max(0, hoverX / rect.width));
    const hoverTimeVal = hoverRatio * duration;
    setHoverTime(hoverTimeVal);
    setHoverXPercent(hoverRatio * 100);
    setShowHoverTime(true);

    const activeChapter = chaptersList.find(c => hoverTimeVal >= c.start && hoverTimeVal < c.end);
    setHoverChapterName(activeChapter ? activeChapter.name : "");
  };

  const handleProgressBarMouseLeave = () => {
    setShowHoverTime(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full group/player overflow-hidden flex items-center justify-center bg-black select-none rounded-[16px] border border-white/5 shadow-2xl"
      onMouseMove={() => {
        if (!isLocked) setShowControls(true);
      }}
      onClick={handlePlayerClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        handleTouchStart(e);
        handleMouseDown();
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        handleTouchEnd();
        handleMouseUp();
      }}
      onTouchCancel={() => {
        handleTouchEnd();
        handleMouseUp();
      }}
      onWheel={handleWheel}
    >
      {/* Background Poster (Fades on play) */}
      {!isVideoLoaded && posterUrl && (
        <div className="absolute inset-0 bg-cover bg-center z-15 transition-opacity duration-700 ease-out" style={{ backgroundImage: `url(${posterUrl})` }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
            <span className="text-xs text-gray-300 font-extrabold uppercase tracking-widest animate-pulse">Initializing Stream...</span>
          </div>
        </div>
      )}

      {/* Simulated Brightness Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150 z-20"
        style={{ opacity: 1 - brightness }}
      />

      {/* Touch Lock Overlay prompt */}
      {showLockPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 flex flex-col items-center gap-2 shadow-2xl z-40 pointer-events-none animate-pulse">
          <Lock className="w-8 h-8 text-[#E50914]" />
          <span className="text-white text-xs font-bold">🔒 Controls Locked</span>
          <span className="text-[9px] text-gray-400">Tap lock icon to unlock</span>
        </div>
      )}

      {/* Floating HUD Feedback Indicator Overlay */}
      {showHud && hudText && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-3.5 py-2 rounded-full shadow-2xl border border-white/10 tracking-widest uppercase z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <span>{hudIcon}</span>
          <span>{hudText}</span>
        </div>
      )}

      {/* Double Tap Seek Feedback Circles */}
      {doubleTapLeft && (
        <div className="animate-ping-once-left pointer-events-none z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-full w-24 h-24 text-white border border-white/15">
          <span className="text-2xl animate-bounce">⏪</span>
          <span className="text-[11px] font-extrabold font-mono mt-1">-5 Seconds</span>
        </div>
      )}
      {doubleTapRight && (
        <div className="animate-ping-once-right pointer-events-none z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-full w-24 h-24 text-white border border-white/15">
          <span className="text-2xl animate-bounce">⏩</span>
          <span className="text-[11px] font-extrabold font-mono mt-1">+5 Seconds</span>
        </div>
      )}

      {/* Pulsing 2x Playback Speed Indicator Badge */}
      {longPressActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#E50914] text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-[#E50914]/25 tracking-widest uppercase z-30 animate-pulse">
          ⚡ 2X SPEED HOLDING
        </div>
      )}

      {/* Speed Indicator Badge */}
      {showSpeedIndicator && speedIndicatorVal !== null && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-white/10 tracking-widest uppercase z-30 pointer-events-none">
          ⚡ Speed: {speedIndicatorVal}x
        </div>
      )}

      {/* Horizontal Swipe Timeline Scrub Indicator Overlay */}
      {showScrubIndicator && scrubPreviewTime !== null && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-2xl z-30 pointer-events-none">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Seek to</span>
          <span className="text-white text-lg font-mono font-bold text-center">{formatTime(scrubPreviewTime)}</span>
          <span className="text-[9px] text-[#E50914] font-medium mt-1">
            {scrubPreviewTime > currentTime ? `▶ Forward ${formatTime(scrubPreviewTime - currentTime)}` : `◀ Rewind ${formatTime(currentTime - scrubPreviewTime)}`}
          </span>
        </div>
      )}

      {/* Brightness Level Indicator */}
      {showBrightnessIndicator && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-4 z-30 text-[10px] pointer-events-none">
          <span className="text-white">☀️</span>
          <div className="w-1 h-20 bg-white/20 rounded-full overflow-hidden relative">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-75"
              style={{ height: `${brightness * 100}%` }}
            />
          </div>
          <span className="text-white font-extrabold font-mono text-[8px]">{Math.round(brightness * 100)}%</span>
        </div>
      )}

      {/* Volume Level Indicator */}
      {showVolumeIndicator && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-4 z-30 text-[10px] pointer-events-none">
          <span className="text-white">🔊</span>
          <div className="w-1 h-20 bg-white/20 rounded-full overflow-hidden relative">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-[#E50914] transition-all duration-75"
              style={{ height: `${volume * 100}%` }}
            />
          </div>
          <span className="text-white font-extrabold font-mono text-[8px]">{Math.round(volume * 100)}%</span>
        </div>
      )}

      {/* Mobile Fit/Pinch Ratio Button */}
      {showControls && !isLocked && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handlePinchGesture();
          }}
          className="absolute top-6 left-6 w-11 h-11 bg-black/50 border border-white/5 hover:bg-black/70 hover:border-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all z-30 cursor-pointer shadow-lg"
          title="Toggle Aspect Ratio Ratio"
        >
          <Sparkles size={16} />
        </button>
      )}

      {/* Mobile Touch Lock Button */}
      {showControls && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleLock();
          }}
          className="absolute top-6 right-6 w-11 h-11 bg-black/50 border border-white/5 hover:bg-black/70 hover:border-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all z-30 cursor-pointer shadow-lg"
          title={isLocked ? "Unlock Screen" : "Lock Screen"}
        >
          {isLocked ? <Lock size={16} className="text-[#E50914]" /> : <Unlock size={16} />}
        </button>
      )}

      {/* Next Episode Netflix-style Countdown Overlay Card (final 20 seconds) */}
      {showNextCountdown && (
        <div className="absolute bottom-20 right-6 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl z-30 w-72 animate-slide-right">
          <div className="border-b border-white/5 pb-2 flex justify-between items-center">
            <span className="text-[10px] text-[#E50914] font-extrabold tracking-widest uppercase">Up Next</span>
            <span className="text-[10px] text-gray-500 font-mono font-bold">{countdownSeconds}s</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/5 rounded-lg border border-white/10 overflow-hidden relative flex items-center justify-center">
              {posterUrl ? (
                <img src={posterUrl} className="w-full h-full object-cover" alt="Episode Poster" />
              ) : (
                <Tv className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white text-xs font-bold truncate">Episode {episode + 1}</h4>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Playing in {countdownSeconds} seconds</p>
            </div>
          </div>
          <div className="flex gap-2 text-[10px] font-bold">
            <button 
              onClick={() => {
                setShowNextCountdown(false);
                if (onEnded) onEnded();
              }}
              className="flex-1 h-10 rounded-xl bg-[#E50914] text-white hover:bg-[#B91C1C] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play size={10} className="fill-current" />
              <span>Play Now</span>
            </button>
            <button 
              onClick={() => {
                setShowNextCountdown(false);
                setIgnoreCountdown(true);
              }}
              className="flex-1 h-10 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Big Play Button Overlay in center when paused */}
      {!isPlaying && !isLocked && isVideoLoaded && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
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
        onCanPlay={() => setIsVideoLoaded(true)}
        className="w-full h-full object-contain z-10 transition-all duration-200"
        style={{ 
          objectFit: fitMode === "cover" ? "cover" : fitMode === "fill" ? "fill" : "contain"
        }}
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

      {/* Control Bar - Netflix Glassmorphism Overlay */}
      <div 
        onClick={(e) => e.stopPropagation()} // Prevent click-through triggers
        className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-500 ease-out z-30 flex flex-col gap-3.5 ${
          showControls && !isLocked ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)"
        }}
      >
        
        {/* Custom Progress Bar with hover thumb & chapters separation */}
        <div className="flex flex-col gap-1 w-full group/progress relative">
          
          {/* Hover Time & Chapter Bubble Preview */}
          {showHoverTime && (
            <div 
              className="absolute bottom-6 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 flex flex-col items-center gap-0.5 shadow-2xl pointer-events-none z-40 transform -translate-x-1/2 text-[9px] font-bold"
              style={{ left: `${hoverXPercent}%` }}
            >
              {hoverChapterName && <span className="text-[#E50914] uppercase tracking-wider block text-[7px]">{hoverChapterName}</span>}
              <span className="text-white font-mono">{formatTime(hoverTime)}</span>
            </div>
          )}

          {/* Progress scroller track */}
          <div 
            className="h-1.5 group-hover/progress:h-2.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden transition-all flex items-center"
            onMouseMove={handleProgressBarMouseMove}
            onMouseLeave={handleProgressBarMouseLeave}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              handleSeekChange(ratio * duration);
            }}
          >
            {/* Dynamic Buffer range sections */}
            {bufferedRanges.map((r, i) => (
              <div 
                key={i}
                className="absolute top-0 bottom-0 bg-white/20 pointer-events-none"
                style={{ left: `${r.start}%`, width: `${r.end - r.start}%` }}
              />
            ))}

            {/* Played timeline */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-[#E50914] pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />

            {/* Chapter Gap Markers */}
            {chaptersList.map((ch, idx) => (
              <div 
                key={idx}
                className="absolute top-0 bottom-0 bg-black/60 w-0.5 pointer-events-none"
                style={{ left: `${(ch.start / (duration || 1)) * 100}%` }}
              />
            ))}
          </div>

          {/* Interactive thumb marker */}
          <div 
            className="absolute w-3.5 h-3.5 rounded-full bg-[#E50914] border border-white/20 pointer-events-none top-1/2 -translate-y-1/2 -ml-1.5 opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Action controls row */}
        <div className="flex items-center justify-between w-full text-white">
          <div className="flex items-center gap-2">
            
            {/* Play/Pause Button (touch size: 48px) */}
            <button 
              onClick={handlePlayPause} 
              className="w-12 h-12 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer text-lg"
              title="Play/Pause"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-current ml-0.5" />}
            </button>

            {/* Skip 5s Rewind */}
            <button 
              onClick={() => handleSeekChange(Math.max(0, currentTime - 5))}
              className="w-11 h-11 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer text-gray-400"
              title="Rewind 5s"
            >
              <RotateCcw size={16} />
            </button>

            {/* Skip 5s Forward */}
            <button 
              onClick={() => handleSeekChange(Math.min(duration, currentTime + 5))}
              className="w-11 h-11 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer text-gray-400"
              title="Forward 5s"
            >
              <RotateCw size={16} />
            </button>

            {/* Expanded hover Volume control */}
            <div className="flex items-center group/volume ml-1.5">
              <button 
                onClick={toggleMute} 
                className="w-12 h-12 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer"
                title="Mute Toggle"
              >
                {isMuted ? <VolumeX size={18} /> : (volume > 0.5 ? <Volume2 size={18} /> : <Volume1 size={18} />)}
              </button>
              <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-[#E50914] h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Time display indicator formatted: current / duration */}
            <span className="text-[10px] font-mono text-gray-400 font-bold ml-2">
              {formatTime(currentTime)} <span className="mx-1 text-white/20">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            
            {/* PiP Mini Player toggle */}
            <button 
              onClick={togglePiP}
              className="w-12 h-12 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer text-gray-400"
              title="Picture-in-Picture Mini Player"
            >
              <Tv size={16} />
            </button>

            {/* Settings Menu Button - Pop-up settings panel drawer */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(!isSettingsOpen);
                  setActiveMenu("main");
                }}
                className={`w-12 h-12 flex items-center justify-center transition-colors cursor-pointer ${
                  isSettingsOpen ? "text-[#E50914]" : "text-gray-400 hover:text-white"
                }`}
                title="Playback Settings"
              >
                <Settings size={18} className={isSettingsOpen ? "rotate-45 transition-transform" : ""} />
              </button>

              {/* Settings Menu Panel */}
              {isSettingsOpen && (
                <div className="absolute bottom-14 right-0 bg-[#0C0C0F]/95 backdrop-blur-xl border border-white/10 rounded-2xl py-2.5 w-60 shadow-2xl z-50 text-[10px] font-bold text-gray-300 animate-slide-right">
                  
                  {/* MAIN PANEL */}
                  {activeMenu === "main" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-3 pb-2 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[#E50914] font-extrabold uppercase tracking-widest text-[8px]">Playback Settings</span>
                      </div>

                      <button 
                        onClick={() => setActiveMenu("quality")} 
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">⚙ Quality</span>
                        <span className="text-gray-400 font-normal flex items-center gap-0.5">
                          {activeResolution} <ChevronRight size={10} />
                        </span>
                      </button>

                      <button 
                        onClick={() => setActiveMenu("subtitle")} 
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">💬 Subtitles / CC</span>
                        <span className="text-gray-400 font-normal flex items-center gap-0.5 max-w-[80px] truncate">
                          {activeSubtitle ? (captions.find(c => c.url === activeSubtitle)?.language || "On") : "Off"} <ChevronRight size={10} />
                        </span>
                      </button>

                      <button 
                        onClick={() => setActiveMenu("speed")} 
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">⚡ Playback Speed</span>
                        <span className="text-gray-400 font-normal flex items-center gap-0.5">
                          {playbackSpeed}x <ChevronRight size={10} />
                        </span>
                      </button>

                      <button 
                        onClick={() => setActiveMenu("sleep")} 
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">⏰ Sleep Timer</span>
                        <span className="text-gray-400 font-normal flex items-center gap-0.5">
                          {sleepTimerMinutes ? `${sleepTimerMinutes}m` : "Off"} <ChevronRight size={10} />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* QUALITY SUB-MENU */}
                  {activeMenu === "quality" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-3 pb-2 border-b border-white/5 flex items-center gap-2">
                        <button onClick={() => setActiveMenu("main")} className="hover:text-white text-gray-400 text-xs">←</button>
                        <span className="text-white font-extrabold uppercase tracking-widest text-[8px]">Resolution Quality</span>
                      </div>
                      {resolutions.map((res: any, idx: number) => (
                        <button
                          key={`${res.resolution}-${idx}`}
                          onClick={() => {
                            onResolutionChange(res);
                            setIsSettingsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 text-left transition-colors ${
                            res.url === url ? "text-[#E50914] font-extrabold" : "text-gray-300"
                          }`}
                        >
                          <span>{res.resolution}</span>
                          {res.url === url && <Check size={10} />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SUBTITLE SUB-MENU */}
                  {activeMenu === "subtitle" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-3 pb-2 border-b border-white/5 flex items-center gap-2">
                        <button onClick={() => setActiveMenu("main")} className="hover:text-white text-gray-400 text-xs">←</button>
                        <span className="text-white font-extrabold uppercase tracking-widest text-[8px]">Subtitles / CC</span>
                      </div>
                      <button
                        onClick={() => {
                          onSubtitleChange("");
                          setIsSettingsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 text-left transition-colors ${
                          !activeSubtitle ? "text-[#E50914] font-extrabold" : "text-gray-300"
                        }`}
                      >
                        <span>Off</span>
                        {!activeSubtitle && <Check size={10} />}
                      </button>
                      {captions.map((cap: any) => (
                        <button
                          key={cap.id}
                          onClick={() => {
                            onSubtitleChange(cap.url);
                            setIsSettingsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 text-left transition-colors ${
                            cap.url === activeSubtitle ? "text-[#E50914] font-extrabold" : "text-gray-300"
                          }`}
                        >
                          <span>{cap.language}</span>
                          {cap.url === activeSubtitle && <Check size={10} />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SPEED SUB-MENU */}
                  {activeMenu === "speed" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-3 pb-2 border-b border-white/5 flex items-center gap-2">
                        <button onClick={() => setActiveMenu("main")} className="hover:text-white text-gray-400 text-xs">←</button>
                        <span className="text-white font-extrabold uppercase tracking-widest text-[8px]">Playback Speed</span>
                      </div>
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            if (onSpeedChange) onSpeedChange(spd);
                            setIsSettingsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 text-left transition-colors ${
                            playbackSpeed === spd ? "text-[#E50914] font-extrabold" : "text-gray-300"
                          }`}
                        >
                          <span>{spd === 1.0 ? "Normal (1x)" : `${spd}x`}</span>
                          {playbackSpeed === spd && <Check size={10} />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SLEEP TIMER SUB-MENU */}
                  {activeMenu === "sleep" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="px-3 pb-2 border-b border-white/5 flex items-center gap-2">
                        <button onClick={() => setActiveMenu("main")} className="hover:text-white text-gray-400 text-xs">←</button>
                        <span className="text-[#E50914] font-extrabold uppercase tracking-widest text-[8px]">Sleep Timer</span>
                      </div>
                      {[
                        { label: "Off", min: null },
                        { label: "10 Minutes", min: 10 },
                        { label: "20 Minutes", min: 20 },
                        { label: "30 Minutes", min: 30 },
                        { label: "60 Minutes", min: 60 }
                      ].map((timer, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSleepTimerMinutes(timer.min);
                            setIsSettingsOpen(false);
                            if (timer.min) triggerHud("⏰", `Sleep Timer Set: ${timer.min}m`);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 text-left transition-colors ${
                            sleepTimerMinutes === timer.min ? "text-[#E50914] font-extrabold" : "text-gray-300"
                          }`}
                        >
                          <span>{timer.label}</span>
                          {sleepTimerMinutes === timer.min && <Check size={10} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen} 
              className="w-12 h-12 flex items-center justify-center hover:text-[#E50914] transition-colors cursor-pointer text-gray-400"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
