"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import Link from "next/link";
import { Play, Info, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["trending", "all", "day"],
    queryFn: () => tmdb.getTrending("all", "day"),
  });

  const validItems = data?.results?.filter((item: any) => item.backdrop_path).slice(0, 8) || [];
  const item = validItems[activeIndex];

  useEffect(() => { setMounted(true); }, []);

  // Auto-advance slides every 10 seconds
  useEffect(() => {
    if (!validItems.length) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validItems.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [validItems.length]);

  if (isLoading || !mounted) {
    return (
      <div className="w-full h-[80vh] md:h-[90vh] bg-[#0A0A0A] flex items-center justify-center border-b border-white/5">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin" />
      </div>
    );
  }

  if (!item) return null;

  const genreMap: Record<number, string> = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
    10759: "Action & Adventure",
    10765: "Sci-Fi & Fantasy"
  };

  const genres = (item.genre_ids || [])
    .map((id: number) => genreMap[id])
    .filter(Boolean)
    .join(" • ");

  const year = (item.release_date || item.first_air_date || "").substring(0, 4);

  return (
    <div className="relative w-full h-[80vh] md:h-[90vh] flex items-end overflow-hidden bg-black select-none group border-b border-white/5">
      {/* ── BACKGROUND IMAGE SLIDESHOW ── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={"bg-" + item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={"https://image.tmdb.org/t/p/original" + item.backdrop_path}
              alt={item.title || item.name || "Hero Background"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Left-to-Right and Bottom-to-Top Gradients matching screenshot */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 z-10 bg-gradient-to-b from-[#0A0A0A]/40 to-transparent" />
      </div>

      {/* ── CONTENT CONTAINER (Left-aligned & Shifted upwards) ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-28 md:pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-xl md:max-w-2xl flex flex-col items-start gap-4"
          >
            {/* Redesigned Metadata Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm font-semibold text-gray-300 select-text mb-1">
              {/* Stars & Rating */}
              <div className="flex items-center gap-1.5 text-[#FBBF24]">
                <span className="tracking-tighter text-sm">
                  {item.vote_average >= 9 ? "★★★★★" : item.vote_average >= 7 ? "★★★★☆" : item.vote_average >= 5 ? "★★★☆☆" : item.vote_average >= 3 ? "★★☆☆☆" : "★☆☆☆☆"}
                </span>
                <span className="text-white font-extrabold">{item.vote_average?.toFixed(1)}</span>
              </div>
              
              <span className="text-gray-600">•</span>
              
              <span className="capitalize text-white bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                {item.media_type === "tv" ? "TV Show" : "Movie"}
              </span>
              
              {year && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{year}</span>
                </>
              )}
              
              {genres && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 font-medium">{genres}</span>
                </>
              )}
            </div>

            {/* Static Typography Title */}
            <h1 
              className="text-4xl md:text-6xl font-black text-white leading-tight select-text"
            >
              {item.title || item.name}
            </h1>

            {/* Synopsis */}
            <p className="text-xs md:text-sm text-gray-300/90 line-clamp-3 leading-relaxed max-w-xl select-text">
              {item.overview}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-2">
              <Link
                href={"/" + (item.media_type || "movie") + "?id=" + item.id}
                className="flex items-center gap-2.5 bg-[#EF4444] hover:bg-red-600 text-white px-8 py-3.5 rounded-lg text-base font-extrabold transition-all hover:scale-[1.04] active:scale-95 duration-200 shadow-lg shadow-red-500/25"
              >
                <Play size={18} className="fill-current" /> Watch Now
              </Link>
              <Link
                href={"/" + (item.media_type || "movie") + "?id=" + item.id}
                className="flex items-center gap-2 bg-black/40 hover:bg-white/10 border border-white/20 text-white px-7 py-3 rounded-lg text-sm font-bold transition-all backdrop-blur-sm"
              >
                <Info size={16} /> More Info
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}