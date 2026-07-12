"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, MediaType } from "@/lib/tmdb";
import Link from "next/link";
import Image from "next/image";
import { Star, Tv, Sparkles, Share2, Heart, Bookmark, Play, Plus, ChevronRight } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import MovieCard from "./MovieCard";
import { useSearchParams } from "next/navigation";

export default function MediaDetail({ mediaType, id }: { mediaType: MediaType; id: string }) {
  const searchParams = useSearchParams();
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeEpisode, setActiveEpisode] = useState(1);
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

  const { data: media, isLoading, error } = useQuery({
    queryKey: ["details", mediaType, id],
    queryFn: () => tmdb.getDetails(mediaType, id),
  });

  // Set document title dynamically
  useEffect(() => {
    if (media) {
      const titleText = media.title || media.name || "Watch Free";
      const yearText = (media.release_date || media.first_air_date || "").substring(0, 4);
      document.title = `${titleText} ${yearText ? `(${yearText})` : ""} — Watch Free on Plexoria`;
    }
  }, [media]);

  const { data: seasonDetails, isLoading: isSeasonLoading } = useQuery({
    queryKey: ["season", id, activeSeason],
    queryFn: () => tmdb.getSeason(id, activeSeason.toString()),
    enabled: mediaType === "tv",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-12 h-12 rounded-full border-4 border-[#E50914]/20 border-t-[#E50914] animate-spin"></div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[#E50914] bg-[#0D0D0D] gap-2">
        <span>Failed to load details for this title.</span>
        <Link href="/" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs">Back to Home</Link>
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

  return (
    <div className="min-h-screen pb-20 bg-[#0A0A0A] text-gray-300 relative select-none">
      
      {/* Top Section: Video Player container (Full Width) */}
      {mediaType !== "person" && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-2">
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#111116] border border-white/5 p-6 rounded-2xl">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-baseline gap-3.5">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {media.title || media.name}
              </h1>
              {media.vote_average > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#FBBF24] font-extrabold">
                  ★ {media.vote_average.toFixed(1)}
                </span>
              )}
            </div>

            {media.tagline && (
              <p className="text-xs text-gray-400 italic">
                "{media.tagline}"
              </p>
            )}

            {/* Metachips & Genres */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              {year && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">{year}</span>
              )}
              {durationText && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">{durationText}</span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-[#E50914]/15 border border-[#E50914]/25 text-[#E50914] uppercase text-[9px] font-black tracking-wider">
                {mediaType}
              </span>
              <div className="flex flex-wrap gap-1.5 ml-1">
                {media.genres?.map((g: any) => (
                  <span key={g.id} className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {mediaType === "tv" && (
              <div className="flex items-center gap-1.5 border border-white/10 rounded-xl bg-white/5 p-1">
                <button
                  disabled={activeEpisode === 1}
                  onClick={() => setActiveEpisode(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  ◀ Prev
                </button>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase px-1">EP {activeEpisode}</span>
                <button
                  disabled={activeEpisode === (seasonDetails?.episodes?.length || 999)}
                  onClick={() => setActiveEpisode(prev => Math.min(seasonDetails?.episodes?.length || 999, prev + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E50914] text-white hover:bg-red-700 disabled:opacity-30 disabled:hover:bg-[#E50914] transition-all"
                >
                  Next ▶
                </button>
              </div>
            )}

            <button 
              onClick={() => setIsAddedToList(!isAddedToList)}
              className={`h-10 px-4 rounded-xl bg-[#1A1A24] hover:bg-[#20202F] text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer ${
                isAddedToList ? "text-[#E50914] border-[#E50914]/30" : ""
              }`}
            >
              <Bookmark size={14} className={isAddedToList ? "fill-current" : ""} />
              <span>{isAddedToList ? "Saved" : "Add to List"}</span>
            </button>

            <button 
              onClick={() => setIsFavorited(!isFavorited)}
              className={`h-10 px-4 rounded-xl bg-[#1A1A24] hover:bg-[#20202F] text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer ${
                isFavorited ? "text-red-500 border-red-500/30" : ""
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
              className="h-10 px-4 rounded-xl bg-[#1A1A24] hover:bg-[#20202F] text-white font-bold text-xs flex items-center gap-2 border border-white/5 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* TV Episodes list */}
        {mediaType === "tv" && (
          <div className="space-y-4 bg-[#111116]/50 border border-white/5 p-6 rounded-2xl w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
                📺 Episode Guide
              </h2>
              
              {/* Season switcher */}
              {media.seasons?.length > 0 && (
                <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/10 rounded-xl px-3 py-1.5">
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Season:</span>
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
                        <option key={season.id} value={season.season_number} className="bg-[#111116] text-white">
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
                        ? "bg-[#111116] border-[#E50914] shadow-lg shadow-[#E50914]/15"
                        : "bg-[#161622]/40 hover:bg-[#111116] border-white/5 hover:border-white/10"
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
                        <div className="flex items-center justify-center w-full h-full text-[10px] text-gray-500 font-bold">No Image</div>
                      )}

                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Play size={18} className="fill-current text-white" />
                      </div>

                      {isCurrent && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#E50914] text-[8px] font-extrabold text-white tracking-widest uppercase z-20">
                          PLAYING
                        </div>
                      )}

                      {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-20">
                          <div 
                            className="h-full bg-[#E50914] transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 w-full whitespace-normal">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                          isCurrent ? "text-[#E50914]" : "text-gray-400"
                        }`}>
                          Episode {ep.episode_number}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold">
                          {ep.runtime || 24} min
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#E50914] transition-colors">
                        {ep.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {ep.overview || "No synopsis available for this episode."}
                      </p>
                      
                      {progress > 0 && (
                        <span className="text-[9px] text-[#E50914] font-bold mt-1 flex items-center gap-1">
                          ✓ Watched {progress}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content details layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Left Column: Cast & Recommendations */}
          <div className="flex-1 w-full lg:max-w-4xl space-y-6">

            {/* Leading Cast members row */}
            {media.credits?.cast?.length > 0 && (
              <section className="pt-4">
                <h2 className="text-sm md:text-base font-extrabold mb-4 flex items-center gap-2 border-b border-white/10 pb-2 text-white">
                  <Sparkles size={14} className="text-[#E50914]" /> Leading Cast
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {media.credits.cast.slice(0, 10).map((person: any) => (
                    <Link href={`/person?id=${person.id}`} key={person.id} className="flex-none w-20 snap-start group text-center">
                      <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/5 mb-1.5 shadow-lg border border-white/10 group-hover:border-[#E50914]/40 transition-colors">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            fill
                            sizes="64px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-[10px] text-gray-500 font-bold">No Photo</div>
                        )}
                      </div>
                      <p className="font-bold text-[10px] truncate px-1 text-white">{person.name}</p>
                      <p className="text-[9px] text-gray-400 truncate px-1">{person.character}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations segment */}
            {media.similar?.results?.length > 0 && (
              <section className="space-y-4 pt-4">
                <h2 className="text-sm md:text-base font-extrabold flex items-center gap-2 border-b border-white/10 pb-2 text-white">
                  <Sparkles size={14} className="text-[#E50914]" /> Recommended Titles
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {media.similar.results
                    .filter((item: any) => item.poster_path)
                    .slice(0, 10)
                    .map((item: any) => (
                      <MovieCard key={item.id} item={item} mediaType={mediaType} />
                    ))}
                </div>
              </section>
            )}

            {/* Comments segment */}
            <section className="bg-[#111116] border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-white/10 pb-2">
                💬 User Reviews & Comments
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3 border-b border-white/5 pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#E50914] text-white flex items-center justify-center font-bold text-xs">A</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Alex Johnson</span>
                      <span className="text-[9px] text-gray-500">2 hours ago</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Loved the pacing of this! The video stream was super fast and clean. Thanks for uploading.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 border-b border-white/5 pb-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">M</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Maria S.</span>
                      <span className="text-[9px] text-gray-500">1 day ago</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
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
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]"
                  />
                  <button className="px-4 py-2 bg-[#E50914] text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors">
                    Post
                  </button>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Synopsis Details & Additional technical parameters */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            
            {/* Synopsis Card */}
            <div className="bg-[#111116] border border-white/5 p-6 rounded-2xl space-y-3">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2">
                📖 Synopsis
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed select-text">
                {media.overview}
              </p>
            </div>

            {/* Metadata technical block */}
            <div className="bg-[#111116] border border-white/5 p-6 rounded-2xl space-y-4 text-[11px]">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2">Metadata Details</h3>
              
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold text-white">{media.status}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-gray-400">Language</span>
                <span className="font-semibold text-white uppercase">{media.original_language}</span>
              </div>
              {media.production_companies?.length > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Studio</span>
                  <span className="font-semibold text-white truncate max-w-[140px]" title={media.production_companies[0].name}>
                    {media.production_companies[0].name}
                  </span>
                </div>
              )}
              {media.production_countries?.length > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Country</span>
                  <span className="font-semibold text-white truncate max-w-[140px]" title={media.production_countries[0].name}>
                    {media.production_countries[0].name}
                  </span>
                </div>
              )}
              
              {mediaType === "movie" && media.budget > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-gray-400">Budget</span>
                  <span className="font-semibold text-white">${(media.budget / 1000000).toFixed(1)}M</span>
                </div>
              )}
              {mediaType === "movie" && media.revenue > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400">Box Office</span>
                  <span className="font-semibold text-white">${(media.revenue / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
