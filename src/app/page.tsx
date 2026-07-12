"use client";

import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import MediaRow from "@/components/MediaRow";
import { LandscapeCard } from "@/components/MovieCard";
import { tmdb } from "@/lib/tmdb";

export default function Home() {
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("plexoria_playback_states");
      if (stored) {
        const states = JSON.parse(stored);
        const items = Object.values(states)
          .filter((item: any) => item.progress < 95 && item.progress > 2 && item.mediaId && item.mediaTitle)
          .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
          .slice(0, 10);
        setContinueWatching(items);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <main className="min-h-screen pb-20 bg-[#0A0A0A] text-white">
      {/* Billboard Hero Banners */}
      <Hero />

      {/* Continue Watching Row */}
      {continueWatching.length > 0 && (
        <section className="relative py-4 pl-4 md:pl-12 group select-none overflow-hidden -mt-20 md:-mt-28 z-30 mb-2">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center tracking-wide border-l-4 border-[#E50914] pl-3 mb-3">
            Continue Watching
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide pr-4 md:pr-12">
            {continueWatching.map((item: any) => {
              const mockItem = {
                id: item.mediaId,
                title: item.mediaTitle,
                name: item.mediaTitle,
                media_type: item.mediaType,
                backdrop_path: item.posterUrl ? item.posterUrl.replace("https://image.tmdb.org/t/p/w780", "").replace("https://image.tmdb.org/t/p/w1280", "") : "",
                poster_path: "",
                overview: "",
                genre_ids: [],
                popularity: 0,
                vote_average: 0,
                vote_count: 0
              };

              return (
                <div key={`${item.mediaId}_${item.season}_${item.episode}`} className="relative group shrink-0">
                  <LandscapeCard item={mockItem} mediaType={item.mediaType} />
                  
                  {/* Progress Bar overlay */}
                  <div className="absolute bottom-11 left-0 right-0 h-1.5 bg-white/20 mx-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#E50914] transition-all" 
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {/* Season/Episode indicator overlay */}
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-bold text-gray-300">
                    {item.mediaType === "tv" ? `S${item.season}:E${item.episode}` : "Movie"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Structured Netflix-style Rows matching MovieBox catalog */}
      <div className={`${continueWatching.length > 0 ? "mt-4" : "-mt-24 md:-mt-32"} relative z-20 space-y-4 md:space-y-5`}>
        
        <MediaRow 
          title="Trending Now" 
          fetchFn={() => tmdb.getTrending("all", "day")} 
          mediaType="movie" 
          layout="poster"
        />
        
        <MediaRow 
          title="Popular Movies" 
          fetchFn={() => tmdb.discover("movie", { 
            with_original_language: "en", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
          layout="poster"
        />

        <MediaRow 
          title="Top TV Shows" 
          fetchFn={() => tmdb.discover("tv", { 
            with_original_language: "en", 
            sort_by: "vote_count.desc", 
            "vote_average.gte": "8" 
          })} 
          mediaType="tv" 
          layout="landscape"
        />

        <MediaRow 
          title="Trending Malay Movies" 
          fetchFn={() => tmdb.discover("movie", { 
            with_original_language: "ms", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
          layout="poster"
        />

        <MediaRow 
          title="New K-Dramas" 
          fetchFn={() => tmdb.discover("tv", { 
            with_original_language: "ko", 
            with_genres: "18", 
            sort_by: "first_air_date.desc" 
          })} 
          mediaType="tv" 
          layout="landscape"
        />

        <MediaRow 
          title="Anime & Animation" 
          fetchFn={() => tmdb.discover("movie", { 
            with_genres: "16", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
          layout="landscape"
        />

        <MediaRow 
          title="Action & Sci-Fi Hits" 
          fetchFn={() => tmdb.discover("movie", { 
            with_genres: "28,878", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
          layout="grid"
        />

      </div>
    </main>
  );
}
