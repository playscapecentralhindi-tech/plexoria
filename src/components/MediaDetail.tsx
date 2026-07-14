"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, MediaType } from "@/lib/tmdb";
import Link from "next/link";
import Image from "next/image";
import { Star, Tv, Sparkles, Share2, Heart, Bookmark, Play, Plus, ChevronRight } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import MovieCard from "./MovieCard";
import { useSearchParams } from "next/navigation";
import { FadeIn, FadeUp, StaggerContainer, StaggerItem } from "@/components/AnimatedComponents";
import MediaDetailSkeleton from "@/components/MediaDetailSkeleton";
import ErrorCard from "@/components/ErrorCard";

export default function MediaDetail({ mediaType, id }: { mediaType: MediaType; id: string }) {
  const searchParams = useSearchParams();
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [autoplayOnMount, setAutoplayOnMount] = useState(
    searchParams.get("autoplay") === "1"
  );
  const playerRef = useRef<HTMLDivElement>(null);
  const [watchedProgress, setWatchedProgress] = useState<{ [key: string]: number }>({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAddedToList, setIsAddedToList] = useState(false);

  // Sync state if URL changes
  useEffect(() => {
    const sVal = searchParams.get("s");
    const eVal = searchParams.get("e");
    if (sVal) {
      setActiveSeason(parseInt(sVal, 10));
    }
    if (eVal) {
      setActiveEpisode(parseInt(eVal, 10));
    }
  }, [searchParams]);

  // Read watched progress on load & active episode change
  useEffect(() => {
    try {
      const stored = localStorage.getItem("plexoria_watched_progress");
      if (stored) {
        setWatchedProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeEpisode]);

  const { data: media, isLoading, error, refetch } = useQuery({
    queryKey: ["details", mediaType, id],
    queryFn: () => tmdb.getDetails(mediaType, id),
  });

  // Read watchlist and favorites on mount
  useEffect(() => {
    try {
      const storedList = localStorage.getItem("plexoria_watchlist");
      if (storedList) {
        const watchlistMap = JSON.parse(storedList);
        setIsAddedToList(!!watchlistMap[`${id}_${mediaType}`]);
      }
      
      const storedFavs = localStorage.getItem("plexoria_favorites");
      if (storedFavs) {
        const favsMap = JSON.parse(storedFavs);
        setIsFavorited(!!favsMap[`${id}_${mediaType}`]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id, mediaType]);

  useEffect(() => {
    if (media) {
      const year = (media.release_date || media.first_air_date || "").substring(0, 4);
      const titleText = media.title || media.name || "Media Details";
      document.title = year ? `${titleText} (${year}) — Plexoria` : `${titleText} — Plexoria`;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const snippet = media.overview ? media.overview.substring(0, 150) + "..." : "";
        metaDesc.setAttribute("content", `Stream ${titleText} (${year}) free online on Plexoria: ${snippet}`);
      }
    }
  }, [media]);

  // Auto-scroll and open player when ?autoplay=1
  useEffect(() => {
    if (autoplayOnMount && media && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      setAutoplayOnMount(false);
    }
  }, [media, autoplayOnMount]);


  const { data: seasonDetails, isLoading: isSeasonLoading } = useQuery({
    queryKey: ["season", id, activeSeason],
    queryFn: () => tmdb.getSeason(id, activeSeason.toString()),
    enabled: mediaType === "tv",
  });

  if (isLoading) {
    return <MediaDetailSkeleton />;
  }

  if (error || !media) {
    const errMessage = error instanceof Error
      ? error.message
      : "This title is temporarily unavailable. Please try again.";
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <ErrorCard
          title="Title Unavailable"
          message={errMessage}
          onRetry={() => refetch()}
          showHomeLink
        />
      </div>
    );
  }

  const year = (media.release_date || media.first_air_date || "").substring(0, 4);
  const runtimeHours = media.runtime ? Math.floor(media.runtime / 60) : 0;
  const runtimeMinutes = media.runtime ? media.runtime % 60 : 0;
  const durationText = media.runtime 
    ? `${runtimeHours > 0 ? `${runtimeHours}h ` : ""}${runtimeMinutes}m` 
    : media.episode_run_time?.length 
    ? `${media.episode_run_time[0]}m per episode` 
    : "";

  // Locate active episode object
  const activeEpisodeObj = mediaType === "tv" 
    ? seasonDetails?.episodes?.find((ep: any) => ep.episode_number === activeEpisode)
    : null;

  // Build active episode details
  const activeEpisodeTitle = activeEpisodeObj?.name || "";
  const activeEpisodeRuntime = activeEpisodeObj?.runtime || media.episode_run_time?.[0] || 24;

  const currentPosterUrl = activeEpisodeObj?.still_path
    ? `https://image.tmdb.org/t/p/w780${activeEpisodeObj.still_path}`
    : media.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${media.backdrop_path}`
    : "";

  const handleToggleWatchlist = () => {
    if (!media) return;
    try {
      const stored = localStorage.getItem("plexoria_watchlist") || "{}";
      const watchlistMap = JSON.parse(stored);
      const key = `${id}_${mediaType}`;
      if (watchlistMap[key]) {
        delete watchlistMap[key];
        setIsAddedToList(false);
      } else {
        watchlistMap[key] = {
          id: media.id,
          title: media.title || media.name,
          name: media.title || media.name,
          poster_path: media.poster_path,
          backdrop_path: media.backdrop_path,
          media_type: mediaType,
          vote_average: media.vote_average,
          addedAt: Date.now()
        };
        setIsAddedToList(true);
      }
      localStorage.setItem("plexoria_watchlist", JSON.stringify(watchlistMap));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = () => {
    if (!media) return;
    try {
      const stored = localStorage.getItem("plexoria_favorites") || "{}";
      const favsMap = JSON.parse(stored);
      const key = `${id}_${mediaType}`;
      if (favsMap[key]) {
        delete favsMap[key];
        setIsFavorited(false);
      } else {
        favsMap[key] = {
          id: media.id,
          title: media.title || media.name,
          name: media.title || media.name,
          poster_path: media.poster_path,
          backdrop_path: media.backdrop_path,
          media_type: mediaType,
          vote_average: media.vote_average,
          addedAt: Date.now()
        };
        setIsFavorited(true);
      }
      localStorage.setItem("plexoria_favorites", JSON.stringify(favsMap));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-black text-slate-300 relative select-none">
      
      {/* Top Section: Video Player container (Full Width) */}
      {mediaType !== "person" && (
        <div ref={playerRef} className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-2">
          <VideoPlayer
            mediaType={mediaType as "movie" | "tv"}
            id={id}
            imdbId={media.external_ids?.imdb_id || media.imdb_id}
            title={media.title || media.name}
            season={activeSeason}
            episode={activeEpisode}
            onEpisodeChange={(ep) => setActiveEpisode(ep)}
            totalEpisodes={seasonDetails?.episodes?.length || 999}
            episodesList={seasonDetails?.episodes || []}
            onSeasonChange={(s) => {
              setActiveSeason(s);
              setActiveEpisode(1);
            }}
            seasonsList={media.seasons || []}
            posterUrl={currentPosterUrl}
            episodeTitle={activeEpisodeTitle}
            episodeRuntime={activeEpisodeRuntime}
          />
        </div>
      )}

      {/* Main Container below Player */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-6">
        
        {/* Title, rating, genres & action row */}
        <FadeUp className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-card p-6 rounded-2xl w-full hover:scale-100 hover:translate-y-0">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-baseline gap-3.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {media.title || media.name}
              </h1>
              {media.vote_average > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#F59E0B] font-extrabold">
                  ★ {media.vote_average.toFixed(1)}
                </span>
              )}
            </div>

            {media.tagline && (
              <p className="text-xs text-slate-400 italic">
                "{media.tagline}"
              </p>
            )}

            {/* Metachips & Genres */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              {year && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">{year}</span>
              )}
              {durationText && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">{durationText}</span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444]/25 text-[#EF4444] uppercase text-[9px] font-black tracking-wider">
                {mediaType}
              </span>
              <div className="flex flex-wrap gap-1.5 ml-1">
                {media.genres?.map((g: any) => (
                  <span key={g.id} className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {mediaType === "tv" && (
              <div className="flex items-center gap-1.5 border border-white/5 rounded-xl bg-white/5 p-1">
                <button
                  disabled={activeEpisode === 1}
                  onClick={() => setActiveEpisode(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  ◀ Prev
                </button>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase px-1">EP {activeEpisode}</span>
                <button
                  disabled={activeEpisode === (seasonDetails?.episodes?.length || 999)}
                  onClick={() => setActiveEpisode(prev => Math.min(seasonDetails?.episodes?.length || 999, prev + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-30 disabled:hover:bg-[#EF4444] transition-all"
                >
                  Next ▶
                </button>
              </div>
            )}

            <button 
              onClick={handleToggleWatchlist}
              className={`h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer ${
                isAddedToList ? "text-[#EF4444] border-[#EF4444]/30" : ""
              }`}
            >
              <Bookmark size={14} className={isAddedToList ? "fill-current" : ""} />
              <span>{isAddedToList ? "Saved" : "Add to List"}</span>
            </button>

            <button 
              onClick={handleToggleFavorite}
              className={`h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer ${
                isFavorited ? "text-[#EF4444] border-[#EF4444]/30" : ""
              }`}
            >
              <Heart size={14} className={isFavorited ? "fill-current" : ""} />
              <span>Favorite</span>
            </button>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Share link copied to clipboard!");
              }}
              className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </FadeUp>

        {/* TV Episodes list */}
        {mediaType === "tv" && (
          <FadeUp className="space-y-4 glass-card p-6 rounded-2xl w-full hover:scale-100 hover:translate-y-0">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                📺 Episode Guide
              </h2>
              
              {/* Season switcher */}
              {media.seasons?.length > 0 && (
                <div className="flex items-center gap-2 glass border border-white/5 rounded-xl px-3 py-1.5">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Season:</span>
                  <select
                    value={activeSeason}
                    onChange={(e) => {
                      setActiveSeason(parseInt(e.target.value));
                      setActiveEpisode(1);
                    }}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    {media.seasons
                      .filter((s: any) => s.season_number > 0)
                      .map((season: any) => (
                        <option key={season.id} value={season.season_number} className="bg-[#0A0A0F] text-white">
                          {season.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Episode cards carousel */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scroll-smooth w-full">
              {seasonDetails?.episodes?.map((ep: any) => {
                const isCurrent = ep.episode_number === activeEpisode;
                const key = `${id}_${activeSeason}_${ep.episode_number}`;
                const progress = watchedProgress[key] || 0;

                const stillUrl = ep.still_path 
                  ? `https://image.tmdb.org/t/p/w300${ep.still_path}` 
                  : media.backdrop_path 
                  ? `https://image.tmdb.org/t/p/w300${media.backdrop_path}` 
                  : "";

                return (
                  <button
                    key={ep.id}
                    onClick={() => setActiveEpisode(ep.episode_number)}
                    className={`relative w-72 md:w-80 flex flex-col gap-3 p-3 rounded-xl border text-left transition-all duration-300 flex-shrink-0 group ${
                      isCurrent
                        ? "bg-[#0A0A0F] border-[#EF4444] shadow-lg shadow-[#EF4444]/15"
                        : "glass-card border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden relative border border-white/5 bg-white/5">
                      {stillUrl ? (
                        <Image
                          src={stillUrl}
                          alt={ep.name}
                          fill
                          sizes="(max-width: 768px) 280px, 320px"
                          className="object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-[10px] text-slate-500 font-bold">No Image</div>
                      )}

                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Play size={18} className="fill-current text-white" />
                      </div>

                      {isCurrent && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#EF4444] text-[8px] font-extrabold text-white tracking-widest uppercase z-20">
                          PLAYING
                        </div>
                      )}

                      {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-20">
                          <div 
                            className="h-full bg-[#EF4444] transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 w-full whitespace-normal">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                          isCurrent ? "text-[#EF4444]" : "text-slate-400"
                        }`}>
                          Episode {ep.episode_number}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {ep.runtime || 24} min
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#EF4444] transition-colors">
                        {ep.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {ep.overview || "No synopsis available for this episode."}
                      </p>
                      
                      {progress > 0 && (
                        <span className="text-[9px] text-[#EF4444] font-bold mt-1 flex items-center gap-1">
                          ✓ Watched {progress}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </FadeUp>
        )}

        {/* Content details layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Left Column: Cast & Recommendations */}
          <div className="flex-1 w-full lg:max-w-4xl space-y-6">

            {/* Leading Cast members row */}
            {media.credits?.cast?.length > 0 && (
              <FadeUp className="pt-4">
                <h2 className="text-sm md:text-base font-extrabold mb-4 flex items-center gap-2 border-b border-white/5 pb-2 text-white">
                  <Sparkles size={14} className="text-[#EF4444]" /> Leading Cast
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {media.credits.cast.slice(0, 10).map((person: any) => (
                    <Link href={`/person?id=${person.id}`} key={person.id} className="flex-none w-20 snap-start group text-center">
                      <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/5 mb-1.5 shadow-lg border border-white/5 group-hover:border-[#EF4444]/40 transition-colors">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            fill
                            sizes="64px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-[10px] text-slate-500 font-bold">No Photo</div>
                        )}
                      </div>
                      <p className="font-bold text-[10px] truncate px-1 text-white">{person.name}</p>
                      <p className="text-[9px] text-slate-400 truncate px-1">{person.character}</p>
                    </Link>
                  ))}
                </div>
              </FadeUp>
            )}

            {/* Recommendations segment */}
            {media.similar?.results?.length > 0 && (
              <FadeUp className="space-y-4 pt-4">
                <h2 className="text-sm md:text-base font-extrabold flex items-center gap-2 border-b border-white/5 pb-2 text-white">
                  <Sparkles size={14} className="text-[#EF4444]" /> Recommended Titles
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {media.similar.results
                    .filter((item: any) => item.poster_path)
                    .slice(0, 10)
                    .map((item: any) => (
                      <MovieCard key={item.id} item={item} mediaType={mediaType} />
                    ))}
                </div>
              </FadeUp>
            )}

            {/* Comments segment */}
            <FadeUp className="glass-card p-6 rounded-2xl space-y-4 w-full hover:scale-100 hover:translate-y-0">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2">
                💬 User Reviews & Comments
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3 border-b border-white/5 pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-bold text-xs">A</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Alex Johnson</span>
                      <span className="text-[9px] text-slate-500">2 hours ago</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Loved the pacing of this! The video stream was super fast and clean. Thanks for uploading.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 border-b border-white/5 pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center font-bold text-xs">M</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Maria S.</span>
                      <span className="text-[9px] text-slate-500">1 day ago</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      One of my favorite episodes. The quality controls and speed parameters work flawlessly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Fake post input block */}
              <div className="flex gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs">U</div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EF4444]"
                  />
                  <button className="px-4 py-2 bg-[#EF4444] text-white font-bold text-xs rounded-xl hover:bg-[#DC2626] transition-colors">
                    Post
                  </button>
                </div>
              </div>
            </FadeUp>

          </div>

          {/* Right Column: Synopsis Details & Additional technical parameters */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            
            {/* Synopsis Card */}
            <FadeUp className="glass-card p-6 rounded-2xl space-y-3 w-full hover:scale-100 hover:translate-y-0">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-white/5 pb-2">
                📖 Synopsis
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed select-text">
                {media.overview}
              </p>
            </FadeUp>

            {/* Metadata technical block */}
            <FadeUp className="glass-card p-6 rounded-2xl space-y-4 text-[11px] w-full hover:scale-100 hover:translate-y-0" delay={0.15}>
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-white/5 pb-2">Metadata Details</h3>
              
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-white">{media.status}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Language</span>
                <span className="font-semibold text-white uppercase">{media.original_language}</span>
              </div>
              {media.production_companies?.length > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Studio</span>
                  <span className="font-semibold text-white truncate max-w-[140px]" title={media.production_companies[0].name}>
                    {media.production_companies[0].name}
                  </span>
                </div>
              )}
              {media.production_countries?.length > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Country</span>
                  <span className="font-semibold text-white truncate max-w-[140px]" title={media.production_countries[0].name}>
                    {media.production_countries[0].name}
                  </span>
                </div>
              )}
              
              {mediaType === "movie" && media.budget > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Budget</span>
                  <span className="font-semibold text-white">${(media.budget / 1000000).toFixed(1)}M</span>
                </div>
              )}
              {mediaType === "movie" && media.revenue > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Box Office</span>
                  <span className="font-semibold text-white">${(media.revenue / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </FadeUp>
          </div>

        </div>

      </div>

    </div>
  );
}
