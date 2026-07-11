"use client";

import Hero from "@/components/Hero";
import MediaRow from "@/components/MediaRow";
import { tmdb } from "@/lib/tmdb";

export default function Home() {
  return (
    <main className="min-h-screen pb-20 bg-[#0A0A0A] text-white">
      {/* Billboard Hero Banners */}
      <Hero />

      {/* Structured Netflix-style Rows matching MovieBox catalog */}
      <div className="-mt-24 md:-mt-32 relative z-20 space-y-6 md:space-y-8">
        
        <MediaRow 
          title="Trending Now" 
          fetchFn={() => tmdb.getTrending("all", "day")} 
          mediaType="movie" 
        />
        
        <MediaRow 
          title="Popular Movies" 
          fetchFn={() => tmdb.discover("movie", { 
            with_original_language: "en", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
        />

        <MediaRow 
          title="Top TV Shows" 
          fetchFn={() => tmdb.discover("tv", { 
            with_original_language: "en", 
            sort_by: "vote_count.desc", 
            "vote_average.gte": "8" 
          })} 
          mediaType="tv" 
        />

        <MediaRow 
          title="Trending Malay Movies" 
          fetchFn={() => tmdb.discover("movie", { 
            with_original_language: "ms", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
        />

        <MediaRow 
          title="New K-Dramas" 
          fetchFn={() => tmdb.discover("tv", { 
            with_original_language: "ko", 
            with_genres: "18", 
            sort_by: "first_air_date.desc" 
          })} 
          mediaType="tv" 
        />

        <MediaRow 
          title="Anime & Animation" 
          fetchFn={() => tmdb.discover("movie", { 
            with_genres: "16", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
        />

        <MediaRow 
          title="Action & Sci-Fi Hits" 
          fetchFn={() => tmdb.discover("movie", { 
            with_genres: "28,878", 
            sort_by: "popularity.desc" 
          })} 
          mediaType="movie" 
        />

      </div>
    </main>
  );
}
