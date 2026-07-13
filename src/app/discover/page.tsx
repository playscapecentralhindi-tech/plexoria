"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, MediaType } from "@/lib/tmdb";
import { Filter, Sparkles } from "lucide-react";
import MovieCard, { SkeletonCard } from "@/components/MovieCard";
import { motion } from "framer-motion";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DiscoverContent() {
  const searchParams = useSearchParams();
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "movie" || typeParam === "tv") {
      setMediaType(typeParam as MediaType);
    }
  }, [searchParams]);

  useEffect(() => {
    document.title = "Discover Movies & TV Shows — Plexoria";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Explore and filter through Plexoria's vast collection of free streaming movies and TV shows by genre, media type, release year, and rating.");
    }
  }, []);

  const { data: genresData } = useQuery({
    queryKey: ["genres", mediaType],
    queryFn: () => tmdb.getGenres(mediaType),
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["discover", mediaType, genre, year, sortBy],
    queryFn: () => {
      const params: Record<string, string> = { sort_by: sortBy };
      if (genre) params.with_genres = genre;
      if (year) {
        if (mediaType === "movie") params.primary_release_year = year;
        else params.first_air_date_year = year;
      }
      return tmdb.discover(mediaType, params);
    },
  });

  const list = (results?.results || []).filter((item: any) => item.poster_path);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 flex flex-col md:flex-row gap-8 select-none relative z-10 min-h-screen text-slate-300">
      
      {/* Sidebar Filters - Liquid Glass style */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full md:w-64 shrink-0 space-y-6 liquid-glass p-5 h-fit border border-white/5"
      >
        <div className="flex items-center gap-2 text-base font-extrabold border-b border-white/5 pb-3 text-white">
          <Filter size={16} className="text-[#EF4444]" /> Catalog Filters
        </div>

        {/* Media type toggle */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Media Type</label>
          <div className="flex bg-black/45 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => { setMediaType("movie"); setGenre(""); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mediaType === "movie" 
                  ? "bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-white shadow-md shadow-red-500/15" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => { setMediaType("tv"); setGenre(""); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mediaType === "tv" 
                  ? "bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-white shadow-md shadow-red-500/15" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              TV Shows
            </button>
          </div>
        </div>

        {/* Genre Selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Genre</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-black/60 border border-white/5 text-white text-xs font-semibold rounded-xl p-2.5 focus:outline-none focus:border-[#EF4444] cursor-pointer"
          >
            <option value="" className="bg-[#0A0A0F]">All Genres</option>
            {genresData?.genres.map(g => (
              <option key={g.id} value={g.id} className="bg-[#0A0A0F]">{g.name}</option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Release Year</label>
          <input
            type="number"
            placeholder="e.g. 2024"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-black/60 border border-white/5 text-white text-xs font-semibold rounded-xl p-2.5 focus:outline-none focus:border-[#EF4444]"
          />
        </div>

        {/* Sorting options */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sort Results</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-black/60 border border-white/5 text-white text-xs font-semibold rounded-xl p-2.5 focus:outline-none focus:border-[#EF4444] cursor-pointer"
          >
            <option value="popularity.desc" className="bg-[#0A0A0F]">Popularity Descending</option>
            <option value="popularity.asc" className="bg-[#0A0A0F]">Popularity Ascending</option>
            <option value="vote_average.desc" className="bg-[#0A0A0F]">Rating Descending</option>
            <option value="vote_average.asc" className="bg-[#0A0A0F]">Rating Ascending</option>
            <option value="primary_release_date.desc" className="bg-[#0A0A0F]">Release Date Descending</option>
          </select>
        </div>
      </motion.div>

      {/* Results Grid layout */}
      <div className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-slate-400 py-20 bg-[#0A0A0F]/50 border border-white/5 rounded-2xl p-8 max-w-sm mx-auto flex flex-col items-center gap-3"
          >
            <span className="text-3xl">🏜️</span>
            <p className="font-bold text-sm text-white">No matching titles</p>
            <p className="text-xs text-slate-500 leading-normal">
              No movies or TV shows matched your selected combination filters.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fade-in"
          >
            {list.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <MovieCard item={item} mediaType={mediaType} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 flex flex-col md:flex-row gap-8 select-none relative z-10 min-h-screen text-slate-300">
        <div className="w-full md:w-64 shrink-0 space-y-6 liquid-glass p-5 h-fit border border-white/5">
          <div className="flex items-center gap-2 text-base font-extrabold border-b border-white/5 pb-3 text-white">
            <Filter size={16} className="text-[#EF4444]" /> Catalog Filters
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  );
}
