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
            ? `/api/moviebox/play/index.php?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}&_t=${Date.now()}`
            : `/api/moviebox/play?title=${encodeURIComponent(title)}&mediaType=${mediaType}&season=${season}&episode=${episode}&dub=${dubParam}&_t=${Date.now()}`
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
  onSpeedChange,
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

  // Gesture indicators & overlays
  const [doubleTapLeft, setDoubleTapLeft] = useState(false);
  const [doubleTapRight, setDoubleTapRight] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

  // Speed and Scrub indicators
  const [speedIndicatorVal, setSpeedIndicatorVal] = useState<number | null>(null);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [showScrubIndicator, setShowScrubIndicator] = useState(false);

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
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredProgressRef = useRef(false);

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

  // Track stream switching for progress restore
  useEffect(() => {
    hasRestoredProgressRef.current = false;
    setShowNextCountdown(false);
    setIgnoreCountdown(false);
  }, [url]);

  // Save progress percentage to localStorage
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);

    const dur = video.duration || duration;
    if (dur > 0) {
      const percentage = Math.round((cur / dur) * 100);
      try {
        // Save to classic watched progress map
        const storedProgress = localStorage.getItem("plexoria_watched_progress") || "{}";
        const progressMap = JSON.parse(storedProgress);
        const key = `${mediaId}_${season}_${episode}`;
        
        if (percentage > 95) {
          progressMap[key] = 100;
        } else if (percentage > 1) {
          progressMap[key] = percentage;
        }
        localStorage.setItem("plexoria_watched_progress", JSON.stringify(progressMap));

        // Save detailed playback state map (resuming exactly where they left off)
        const storedStates = localStorage.getItem("plexoria_playback_states") || "{}";
        const playbackStates = JSON.parse(storedStates);
        playbackStates[key] = {
          timestamp: cur,
          progress: percentage,
          quality: activeResolution,
          speed: playbackSpeed,
          subtitle: activeSubtitle,
          updatedAt: Date.now()
        };
        localStorage.setItem("plexoria_playback_states", JSON.stringify(playbackStates));
      } catch (e) {
        console.error(e);
      }

      // Up Next Episode Countdown (final 20 seconds)
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

    // Auto-Resume watched progress on load
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

  // Keyboard shortcuts event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in search box or inputs
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "arrowleft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          setDoubleTapLeft(true);
          setTimeout(() => setDoubleTapLeft(false), 500);
          break;
        case "arrowright":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 99999, video.currentTime + 5);
          setDoubleTapRight(true);
          setTimeout(() => setDoubleTapRight(false), 500);
          break;
        case "arrowup":
          e.preventDefault();
          const incVol = Math.min(1.0, video.volume + 0.1);
          video.volume = incVol;
          setVolume(incVol);
          setIsMuted(incVol === 0);
          setShowVolumeIndicator(true);
          if (volumeIndicatorTimeoutRef.current) clearTimeout(volumeIndicatorTimeoutRef.current);
          volumeIndicatorTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 800);
          break;
        case "arrowdown":
          e.preventDefault();
          const decVol = Math.max(0.0, video.volume - 0.1);
          video.volume = decVol;
          setVolume(decVol);
          setIsMuted(decVol === 0);
          setShowVolumeIndicator(true);
          if (volumeIndicatorTimeoutRef.current) clearTimeout(volumeIndicatorTimeoutRef.current);
          volumeIndicatorTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 800);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "c":
          e.preventDefault();
          if (activeSubtitle) {
            onSubtitleChange("");
          } else if (captions && captions.length > 0) {
            onSubtitleChange(captions[0].url);
          }
          break;
        case "s":
          e.preventDefault();
          // Cycle speed: 0.5 -> 1.0 -> 1.25 -> 1.5 -> 2.0 -> 0.5
          const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
          const curIndex = speeds.indexOf(playbackSpeed);
          const nextSpeed = speeds[(curIndex + 1) % speeds.length];
          if (onSpeedChange) {
            onSpeedChange(nextSpeed);
          }
          setSpeedIndicatorVal(nextSpeed);
          setShowSpeedIndicator(true);
          if (speedIndicatorTimeoutRef.current) clearTimeout(speedIndicatorTimeoutRef.current);
          speedIndicatorTimeoutRef.current = setTimeout(() => setShowSpeedIndicator(false), 800);
          break;
        case "escape":
          if (document.fullscreenElement) {
            e.preventDefault();
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullscreen, activeSubtitle, captions, playbackSpeed, onSpeedChange]);

  // Click handler wrapper supporting single tap controls and double tap seeks
  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    if (e.detail === 2) {
      // Double tap detected! Clear single tap timer.
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
      } else {
        video.currentTime = Math.min(video.duration || 99999, video.currentTime + 5);
        setDoubleTapRight(true);
        setTimeout(() => setDoubleTapRight(false), 500);
      }
    } else {
      // Single tap timer
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        setShowControls(prev => !prev);
      }, 260);
    }
  };

  // Long press for temporary 2x speed controls
  const handleMouseDown = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = 2.0;
        setLongPressActive(true);
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
    }
  };

  // Fullscreen touch swipe handler (brightness, volume, and scrub)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, time: Date.now(), scrubTime: currentTime };

    if (!isFullscreen) {
      // Swipe gestures (scrubbing only if not in fullscreen)
      touchTypeRef.current = "scrub";
      initialValRef.current = currentTime;
    } else {
      // Left side brightness, right side volume if in fullscreen
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
    if (!touchStartRef.current || !touchTypeRef.current) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const deltaX = x - touchStartRef.current.x;
    const deltaY = touchStartRef.current.y - y;

    // Detect if swipe is horizontal scrub
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

    // Vertical movements in fullscreen
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
      const video = videoRef.current;
      if (video) {
        video.currentTime = scrubPreviewTime;
        setCurrentTime(scrubPreviewTime);
      }
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
    const video = videoRef.current;
    if (!video) return;

    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVolume = Math.min(1.0, Math.max(0.0, video.volume + delta));
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    setShowVolumeIndicator(true);

    if (volumeIndicatorTimeoutRef.current) clearTimeout(volumeIndicatorTimeoutRef.current);
    volumeIndicatorTimeoutRef.current = setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 800);
  };

  return (
    <div 
      className="relative w-full h-full group/player overflow-hidden flex items-center justify-center bg-black select-none"
      onMouseMove={() => {
        setShowControls(true);
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
      {/* Simulated Brightness Dark Overlay */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150 z-20"
        style={{ opacity: 1 - brightness }}
      />

      {/* Double Tap Seek Feedback Circles */}
      {doubleTapLeft && (
        <div className="animate-ping-once-left pointer-events-none z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-full w-20 h-20 text-white border border-white/15">
          <span className="text-xl">⏮</span>
          <span className="text-[10px] font-extrabold font-mono mt-1">-5s</span>
        </div>
      )}
      {doubleTapRight && (
        <div className="animate-ping-once-right pointer-events-none z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-full w-20 h-20 text-white border border-white/15">
          <span className="text-xl">⏭</span>
          <span className="text-[10px] font-extrabold font-mono mt-1">+5s</span>
        </div>
      )}

      {/* Pulsing 2x Playback Speed Indicator Badge */}
      {longPressActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#E50914] text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-[#E50914]/25 tracking-widest uppercase z-30">
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

      {/* Auto Play Up Next Countdown Box Overlay (final 20 seconds) */}
      {showNextCountdown && (
        <div className="absolute bottom-16 right-6 bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl z-30 w-64 animate-slide-right">
          <span className="text-[9px] text-[#E50914] font-extrabold tracking-widest uppercase block border-b border-white/5 pb-1">Up Next</span>
          <div className="flex justify-between items-center">
            <span className="text-white text-xs font-bold truncate max-w-[140px]">Episode {episode + 1}</span>
            <span className="text-[10px] text-gray-400 font-mono font-bold">in {countdownSeconds}s</span>
          </div>
          <div className="flex gap-2 text-[10px] font-bold">
            <button 
              onClick={() => {
                setShowNextCountdown(false);
                if (onEnded) onEnded();
              }}
              className="flex-grow py-2 rounded-lg bg-[#E50914] text-white hover:bg-[#B91C1C] transition-colors"
            >
              Play Now
            </button>
            <button 
              onClick={() => {
                setShowNextCountdown(false);
                setIgnoreCountdown(true);
              }}
              className="flex-grow py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Big Play Button Overlay in center when paused */}
      {!isPlaying && (
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
        className="w-full h-full object-contain cursor-pointer z-10"
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
        onClick={(e) => e.stopPropagation()} // Prevent click-through triggers
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-30 ${
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
                <div className="absolute bottom-8 right-0 bg-[#0A0A0F]/95 border border-white/10 rounded-lg py-1.5 w-32 flex flex-col gap-0.5 shadow-2xl z-50 text-[10px]">
                  {resolutions.map((res: any, index: number) => (
                    <button
                      key={`${res.resolution}-${res.format || "MP4"}-${index}`}
                      onClick={() => {
                        onResolutionChange(res);
                        setIsResolutionOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors whitespace-nowrap ${
                        res.url === url ? "text-[#E50914] font-extrabold" : "text-gray-300"
                      }`}
                    >
                      {res.resolution} ({res.format || "MP4"})
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
