"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb, formatMovieBoxTitle } from "@/lib/tmdb";
import Link from "next/link";
import { 
  Play, 
  Info, 
  Star, 
  Bookmark, 
  Check, 
  Film, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Flame, 
  X,
  Sparkles,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [watchlistMap, setWatchlistMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const SLIDE_DURATION = 9000; // 9 seconds per slide

  const { data, isLoading } = useQuery({
    queryKey: ["trending", "all", "day"],
    queryFn: () => tmdb.getTrending("all", "day"),
  });

  const validItems = data?.results?.filter((item: any) => item.backdrop_path).slice(0, 7) || [];
  const item = validItems[activeIndex];

  // Set mounted and read watchlist
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("plexoria_watchlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        const map: Record<string, boolean> = {};
        Object.keys(parsed).forEach((k) => {
          map[k] = true;
        });
        setWatchlistMap(map);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Slide navigation handlers
  const handleNext = useCallback(() => {
    if (!validItems.length) return;
    setActiveIndex((prev) => (prev + 1) % validItems.length);
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    if (!validItems.length) return;
    setActiveIndex((prev) => (prev - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);

  // Auto-advance timer
  useEffect(() => {
    if (!validItems.length || isPaused || trailerModalOpen) return;
    const interval = setInterval(() => {
      handleNext();
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [validItems.length, isPaused, trailerModalOpen, handleNext]);

  // Watchlist Toggle
  const toggleWatchlist = (e: React.MouseEvent, currentItem: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentItem) return;

    const key = `${currentItem.id}_${currentItem.media_type || "movie"}`;
    try {
      const stored = localStorage.getItem("plexoria_watchlist") || "{}";
      const map = JSON.parse(stored);
      let isNowAdded = false;

      if (map[key]) {
        delete map[key];
        isNowAdded = false;
        showToast(`Removed "${currentItem.title || currentItem.name}" from Watchlist`);
      } else {
        map[key] = {
          id: currentItem.id,
          title: currentItem.title || currentItem.name,
          name: currentItem.name || currentItem.title,
          poster_path: currentItem.poster_path,
          backdrop_path: currentItem.backdrop_path,
          media_type: currentItem.media_type || "movie",
          vote_average: currentItem.vote_average,
          release_date: currentItem.release_date || currentItem.first_air_date,
          genre_ids: currentItem.genre_ids,
          overview: currentItem.overview,
          addedAt: Date.now()
        };
        isNowAdded = true;
        showToast(`Added "${currentItem.title || currentItem.name}" to Watchlist`);
      }

      localStorage.setItem("plexoria_watchlist", JSON.stringify(map));
      setWatchlistMap((prev) => ({ ...prev, [key]: isNowAdded }));
    } catch (err) {
      console.error("Watchlist save failed", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open trailer modal & fetch video
  const openTrailer = async (currentItem: any) => {
    if (!currentItem) return;
    setLoadingTrailer(true);
    setTrailerModalOpen(true);
    setTrailerKey(null);

    try {
      const mediaType = currentItem.media_type || "movie";
      const details = await tmdb.getDetails(mediaType, String(currentItem.id));
      const videos = details.videos?.results || [];
      // Find official trailer or teaser
      const trailer = videos.find((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) 
        || videos.find((v: any) => v.site === "YouTube");

      if (trailer?.key) {
        setTrailerKey(trailer.key);
      } else {
        setTrailerKey(null);
      }
    } catch (err) {
      console.error("Trailer fetch error", err);
      setTrailerKey(null);
    } finally {
      setLoadingTrailer(false);
    }
  };

  if (isLoading || !mounted) {
    return (
      <div className="w-full h-[85vh] md:h-[92vh] bg-[#07080D] flex items-center justify-center border-b border-white/5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin" />
            <Sparkles className="w-5 h-5 text-[#EF4444] absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Loading Featured Cinema...</p>
        </div>
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

  const currentKey = `${item.id}_${item.media_type || "movie"}`;
  const isBookmarked = !!watchlistMap[currentKey];
  const year = (item.release_date || item.first_air_date || "").substring(0, 4);

  return (
    <section 
      className="relative w-full h-[88vh] md:h-[94vh] min-h-[640px] flex items-end overflow-hidden bg-[#07080D] select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Featured Cinema Spotlight"
    >
      {/* ── AMBIENT SPOTLIGHT AURA BEHIND HUD ── */}
      <div className="absolute inset-0 pointer-events-none z-10 hero-spotlight opacity-90 transition-opacity duration-1000" />

      {/* ── CINEMATIC DYNAMIC BACKDROP WITH KEN BURNS EFFECT ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={"bg-" + item.id}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } 
            }}
            exit={{ 
              opacity: 0, 
              transition: { duration: 1.0, ease: "easeInOut" } 
            }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={"https://image.tmdb.org/t/p/original" + item.backdrop_path}
              alt={item.title || item.name || "Hero Background"}
              className="absolute inset-0 w-full h-full object-cover object-center transform-gpu"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>

        {/* ── MULTI-LAYER CINEMATIC GRADIENT SYSTEM (WCAG AA TEXT CONTRAST) ── */}
        {/* Bottom deep fade */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          style={{ 
            background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.92) 28%, rgba(10,10,10,0.50) 60%, transparent 100%)' 
          }} 
        />
        {/* Left billboard shadow */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          style={{ 
            background: 'linear-gradient(to right, #0A0A0A 0%, rgba(10,10,10,0.94) 35%, rgba(10,10,10,0.40) 68%, transparent 100%)' 
          }} 
        />
        {/* Top Navbar blend */}
        <div 
          className="absolute inset-x-0 top-0 h-44 z-10 pointer-events-none" 
          style={{ 
            background: 'linear-gradient(to bottom, rgba(5,6,12,0.85) 0%, rgba(5,6,12,0.3) 60%, transparent 100%)' 
          }} 
        />
        {/* Radial vignette */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          style={{ 
            background: 'radial-gradient(ellipse 110% 110% at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)' 
          }} 
        />
      </div>

      {/* ── ARROW NAVIGATION CHEVRONS (Desktop & Tablet) ── */}
      <div className="absolute inset-y-0 left-4 md:left-8 z-30 flex items-center pointer-events-none">
        <button
          onClick={handlePrev}
          aria-label="Previous Slide"
          className="pointer-events-auto p-3 rounded-2xl glass-icon-btn text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center focus:opacity-100"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <div className="absolute inset-y-0 right-4 md:right-8 z-30 flex items-center pointer-events-none">
        <button
          onClick={handleNext}
          aria-label="Next Slide"
          className="pointer-events-auto p-3 rounded-2xl glass-icon-btn text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center focus:opacity-100"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* ── MAIN CONTENT CONTAINER (HERO HUD) ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-20 md:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { staggerChildren: 0.07, delayChildren: 0.05, duration: 0.4 }
              },
              exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-start gap-4 p-6 sm:p-8 md:p-9 rounded-3xl glass-hero glass-border-gradient shadow-2xl relative overflow-hidden backdrop-blur-2xl"
          >
            {/* Subtle inner top glow highlight */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Row 1: Spotlight Tag & Spec Badges */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap items-center gap-2 select-text"
            >
              {/* Trending Rank Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600/30 to-red-900/30 border border-red-500/40 text-red-300 font-black text-[11px] tracking-wider uppercase shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                <Flame size={13} className="text-red-400 fill-red-400 animate-pulse" />
                <span>#{activeIndex + 1} Spotlight</span>
              </div>

              {/* Rating Star Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full rating-badge text-xs font-black text-amber-300">
                <Star size={13} fill="#F59E0B" className="text-amber-500" />
                <span>{item.vote_average?.toFixed(1)}</span>
                {item.vote_count > 0 && (
                  <span className="text-[10px] text-amber-300/70 font-semibold">({item.vote_count})</span>
                )}
              </div>

              {/* Media Type */}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-slate-300 bg-white/5 border border-white/10">
                {item.media_type === "tv" ? "TV Series" : "Cinema Movie"}
              </span>

              {/* Release Year */}
              {year && (
                <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                  {year}
                </span>
              )}

              {/* Resolution & Feature Tags */}
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">4K UHD</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">HDR10+</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">DOLBY 5.1</span>
              </div>
            </motion.div>

            {/* Row 2: Title */}
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight select-text drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] font-sans"
            >
              {formatMovieBoxTitle(item.title || item.name, item.original_language, item.release_date || item.first_air_date)}
            </motion.h1>

            {/* Row 3: Genre Pills */}
            {(item.genre_ids || []).length > 0 && (
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-wrap items-center gap-1.5"
              >
                {(item.genre_ids || []).slice(0, 4).map((id: number) => {
                  const name = genreMap[id];
                  if (!name) return null;
                  return (
                    <span 
                      key={id} 
                      className="text-[11px] font-semibold text-slate-300 px-2.5 py-0.5 rounded-full glass-pill hover:border-red-500/40 hover:text-white transition-colors cursor-default"
                    >
                      {name}
                    </span>
                  );
                })}
              </motion.div>
            )}

            {/* Row 4: Synopsis / Overview */}
            {item.overview && (
              <motion.p 
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                className="text-xs sm:text-sm text-slate-200/90 line-clamp-3 leading-relaxed max-w-xl font-normal select-text drop-shadow-sm"
              >
                {item.overview}
              </motion.p>
            )}

            {/* Row 5: Action Buttons */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto"
            >
              {/* Watch Now Button */}
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={"/" + (item.media_type || "movie") + "?id=" + item.id + "&autoplay=1"}
                  className="glass-btn-primary glass-ripple flex items-center justify-center gap-2.5 text-white px-7 py-3.5 rounded-2xl text-sm font-black tracking-wide shadow-[0_4px_25px_rgba(239,68,68,0.45)] hover:shadow-[0_6px_30px_rgba(239,68,68,0.65)]"
                >
                  <Play size={18} className="fill-current text-white" />
                  <span>Watch Now</span>
                </Link>
              </motion.div>

              {/* Watch Trailer Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openTrailer(item)}
                className="glass-btn-secondary glass-ripple flex items-center justify-center gap-2 text-white px-5 py-3.5 rounded-2xl text-sm font-bold border border-white/15 hover:border-red-500/40 hover:bg-white/10"
              >
                <Film size={17} className="text-red-400" />
                <span>Trailer</span>
              </motion.button>

              {/* Add to Watchlist Icon Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => toggleWatchlist(e, item)}
                aria-label={isBookmarked ? "Remove from Watchlist" : "Add to Watchlist"}
                title={isBookmarked ? "Remove from Watchlist" : "Add to Watchlist"}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center ${
                  isBookmarked
                    ? "bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "glass-btn-secondary text-slate-300 hover:text-white border-white/15"
                }`}
              >
                {isBookmarked ? <Check size={18} /> : <Bookmark size={18} />}
              </motion.button>

              {/* Details Page Link */}
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={"/" + (item.media_type || "movie") + "?id=" + item.id}
                  className="p-3.5 rounded-2xl glass-btn-secondary text-slate-300 hover:text-white border border-white/15 flex items-center justify-center"
                  aria-label="View Details"
                  title="View Details"
                >
                  <Info size={18} />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── INTERACTIVE MINI-THUMBNAIL CAROUSEL DOCK (Bottom Right) ── */}
      <div className="absolute right-4 sm:right-8 lg:right-12 bottom-6 md:bottom-8 z-30 flex flex-col items-end gap-2.5 max-w-[90vw] sm:max-w-md">
        {/* Play/Pause state and slide counter */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 px-3 py-1 rounded-full glass-pill">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            aria-label={isPaused ? "Resume slideshow" : "Pause slideshow"}
          >
            {isPaused ? <Play size={10} className="fill-current text-amber-400" /> : <Pause size={10} className="fill-current" />}
            <span>{isPaused ? "Paused" : "Auto"}</span>
          </button>
          <span className="text-white/20">•</span>
          <span className="text-white">{activeIndex + 1} / {validItems.length}</span>
        </div>

        {/* Thumbnail Cards Deck */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full">
          {validItems.map((thumbItem: any, idx: number) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={thumbItem.id}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Jump to ${thumbItem.title || thumbItem.name}`}
                className={`relative group/thumb rounded-xl overflow-hidden shrink-0 transition-all duration-300 focus:outline-none ${
                  isActive
                    ? "w-24 sm:w-28 h-14 sm:h-16 hero-thumbnail-active scale-105"
                    : "w-14 sm:w-16 h-14 sm:h-16 opacity-60 hover:opacity-100 hover:scale-100"
                }`}
              >
                <img
                  src={"https://image.tmdb.org/t/p/w300" + (thumbItem.backdrop_path || thumbItem.poster_path)}
                  alt={thumbItem.title || thumbItem.name || "Thumbnail"}
                  className="w-full h-full object-cover object-center"
                />

                {/* Dark overlay with title when active */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-1.5 text-left ${isActive ? "opacity-100" : "opacity-0 group-hover/thumb:opacity-100"}`}>
                  <p className="text-[9px] font-bold text-white line-clamp-1 leading-tight">
                    {thumbItem.title || thumbItem.name}
                  </p>
                </div>

                {/* Active progress timer bar */}
                {isActive && !isPaused && !trailerModalOpen && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <motion.div
                      key={`prog-${idx}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                      className="h-full bg-[#EF4444]"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl glass-thick border border-red-500/30 text-white text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <Sparkles size={14} className="text-[#EF4444]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRAILER MODAL (LIQUID GLASS POPUP) ── */}
      <AnimatePresence>
        {trailerModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTrailerModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl rounded-3xl overflow-hidden glass-modal border border-white/15 shadow-2xl flex flex-col bg-[#0A0A10]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <Film size={18} className="text-[#EF4444]" />
                  <h3 className="text-base font-bold text-white">
                    Official Trailer: {item.title || item.name}
                  </h3>
                </div>
                <button
                  onClick={() => setTrailerModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  aria-label="Close Trailer Modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Video Player Container (16:9) */}
              <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                {loadingTrailer ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-3 border-[#EF4444]/30 border-t-[#EF4444] animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">Fetching HD Trailer...</p>
                  </div>
                ) : trailerKey ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                    title={`${item.title || item.name} Trailer`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    <Film size={36} className="text-slate-600" />
                    <p className="text-sm font-semibold text-slate-300">
                      No video trailer stream is currently available for this title.
                    </p>
                    <Link
                      href={"/" + (item.media_type || "movie") + "?id=" + item.id + "&autoplay=1"}
                      className="mt-2 text-xs font-bold text-white px-5 py-2.5 rounded-xl glass-btn-primary"
                    >
                      Watch Full Title Now
                    </Link>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <div className="text-xs text-slate-400 font-medium">
                  {item.overview ? item.overview.slice(0, 120) + "..." : ""}
                </div>
                <Link
                  href={"/" + (item.media_type || "movie") + "?id=" + item.id + "&autoplay=1"}
                  className="shrink-0 flex items-center gap-2 text-xs font-extrabold text-white px-5 py-2.5 rounded-xl glass-btn-primary"
                >
                  <Play size={14} className="fill-current" />
                  Stream Full Movie
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}