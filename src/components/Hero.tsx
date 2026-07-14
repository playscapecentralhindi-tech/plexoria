"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, formatMovieBoxTitle } from "@/lib/tmdb";
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
    <div className="relative w-full h-[82vh] md:h-[92vh] flex items-end overflow-hidden bg-black select-none group">
      {/* ── BACKGROUND IMAGE SLIDESHOW ── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={"bg-" + item.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={"https://image.tmdb.org/t/p/original" + item.backdrop_path}
              alt={item.title || item.name || "Hero Background"}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Cinematic letterbox gradient system */}
        {/* Bottom fade — tall, aggressive for text legibility */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#08090F] via-[#08090F]/60 to-transparent" style={{ background: 'linear-gradient(to top, #08090F 0%, rgba(8,9,15,0.75) 30%, rgba(8,9,15,0.20) 60%, transparent 100%)' }} />
        {/* Left side fade — for info panel */}
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right, #08090F 0%, rgba(8,9,15,0.80) 25%, rgba(8,9,15,0.30) 55%, transparent 100%)' }} />
        {/* Top fade — merges with navbar */}
        <div className="absolute inset-x-0 top-0 h-48 z-10" style={{ background: 'linear-gradient(to bottom, rgba(8,9,15,0.55) 0%, transparent 100%)' }} />
        {/* Edge vignette */}
        <div className="absolute inset-0 z-10" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.25) 100%)' }} />
      </div>

      {/* ── CONTENT CONTAINER ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 md:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08, delayChildren: 0.08 }
              },
              exit: { opacity: 0, y: -8, transition: { duration: 0.22 } }
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-lg md:max-w-2xl flex flex-col items-start gap-4 p-6 md:p-8 rounded-2xl glass-hero glass-border-gradient"
          >
            {/* Metadata badges row */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 24 } } }}
              className="flex flex-wrap items-center gap-2 text-xs font-semibold select-text"
            >
              {/* Rating badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg rating-badge">
                <Star size={12} fill="#F59E0B" className="text-amber-500" />
                <span className="text-amber-400 font-extrabold">{item.vote_average?.toFixed(1)}</span>
              </div>

              {/* Media type pill */}
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase text-red-400 bg-red-500/10 border border-red-500/25">
                {item.media_type === "tv" ? "Series" : "Film"}
              </span>

              {/* Year */}
              {year && <span className="text-slate-400">{year}</span>}

              {/* Quality badges */}
              <span className="text-[9px] font-black tracking-wider border border-white/15 px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-300">HD</span>
              <span className="text-[9px] font-black tracking-wider border border-white/15 px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-300">SUB</span>
            </motion.div>

            {/* Genre pills */}
            {genres && (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 22 } } }}
                className="flex flex-wrap gap-1.5"
              >
                {(item.genre_ids || []).slice(0, 3).map((id: number) => {
                  const genreMap: Record<number, string> = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 27: "Horror", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure", 10765: "Sci-Fi & Fantasy" };
                  const name = genreMap[id];
                  if (!name) return null;
                  return (
                    <span key={id} className="text-[10px] font-semibold text-slate-300 px-2 py-0.5 rounded-full glass border border-white/10">
                      {name}
                    </span>
                  );
                })}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } } }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.05] select-text tracking-tight"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.50)' }}
            >
              {formatMovieBoxTitle(item.title || item.name, item.original_language, item.release_date || item.first_air_date)}
            </motion.h1>

            {/* Synopsis */}
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } } }}
              className="text-xs md:text-sm text-slate-300/85 line-clamp-3 leading-relaxed max-w-xl select-text"
            >
              {item.overview}
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } } }}
              className="flex items-center gap-3 pt-1"
            >
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link
                  href={"/" + (item.media_type || "movie") + "?id=" + item.id + "&autoplay=1"}
                  className="glass-btn-primary glass-ripple flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-extrabold"
                >
                  <Play size={16} className="fill-current" /> Watch Now
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link
                  href={"/" + (item.media_type || "movie") + "?id=" + item.id}
                  className="glass-btn-secondary glass-ripple flex items-center gap-2 text-white px-5 py-3 rounded-xl text-sm font-semibold"
                >
                  <Info size={15} /> More Info
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicators */}
      <div className="absolute right-4 sm:right-8 lg:right-12 bottom-8 z-30 flex items-center gap-1.5">
        {validItems.map((_, idx) => (
          <motion.button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className="relative h-1 rounded-full overflow-hidden cursor-pointer focus:outline-none"
            animate={{ width: activeIndex === idx ? 36 : 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundColor: 'rgba(255,255,255,0.20)' }}
            aria-label={`Go to slide ${idx + 1}`}
          >
            {activeIndex === idx && (
              <motion.div
                key={`progress-${idx}`}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 10, ease: "linear" }}
                className="absolute top-0 left-0 bottom-0 rounded-full"
                style={{ background: 'linear-gradient(to right, #EF4444, #DC2626)' }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}