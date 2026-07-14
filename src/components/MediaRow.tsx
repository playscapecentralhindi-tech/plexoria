"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaItem, PaginatedResponse } from "@/lib/tmdb";
import MovieCard, { SkeletonCard, LandscapeCard, SkeletonLandscapeCard } from "./MovieCard";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface MediaRowProps {
  title: string;
  fetchFn: () => Promise<PaginatedResponse<MediaItem>>;
  mediaType: "movie" | "tv";
  layout?: "poster" | "landscape" | "grid" | "top10";
}

export default function MediaRow({ title, fetchFn, mediaType, layout = "poster" }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: [title],
    queryFn: fetchFn,
  });

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const items = (data?.results || []).filter((item: any) => item.poster_path);

  if (error) {
    return (
      <div className="h-64 mx-4 md:mx-12 rounded-xl bg-red-900/10 border border-red-500/20 flex flex-col items-center justify-center gap-2 text-red-400 text-sm">
        <span>Failed to load details for category: <strong>{title}</strong></span>
      </div>
    );
  }

  // Framer Motion staggered grid variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative py-4 pl-4 md:pl-12 group select-none overflow-hidden"
    >
      {/* Title */}
      <div className="flex items-center justify-between pr-4 md:pr-12 mb-4">
        <h2 className="text-base md:text-lg font-extrabold text-[#F1F5F9] flex items-center tracking-tight">
          <span className="inline-block w-[3px] h-5 rounded-full bg-gradient-to-b from-[#EF4444] to-[#B91C1C] mr-3 shrink-0" />
          {title}
        </h2>
        <Link
          href={mediaType === "movie" ? "/discover?type=movie" : "/discover?type=tv"}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-200 transition-colors font-semibold group/viewall glass px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
        >
          <span>View All</span>
          <ChevronRight size={12} className="group-hover/viewall:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Row Wrapper */}
      <div className="relative w-full">
        {/* Navigation Left Arrow */}
        {layout !== "grid" && (
          <motion.button
            onClick={() => handleScroll("left")}
            whileHover={{ scale: 1.08, x: -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass-mid flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 border border-white/[0.08]"
            title="Scroll Left"
          >
            <ChevronLeft size={18} />
          </motion.button>
        )}

        {/* Horizontal Scrollable Row or Static Grid */}
        {isLoading ? (
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide pr-4 md:pr-12">
            {[...Array(6)].map((_, i) => (
              layout === "landscape" ? <SkeletonLandscapeCard key={i} /> : <SkeletonCard key={i} />
            ))}
          </div>
        ) : layout === "grid" ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pr-4 md:pr-12"
          >
            {items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <MovieCard item={item} mediaType={mediaType} />
              </motion.div>
            ))}
          </motion.div>
        ) : layout === "top10" ? (
          <motion.div
            ref={rowRef}
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth pr-4 md:pr-12"
          >
            {items.slice(0, 10).map((item, idx) => (
              <motion.div 
                key={item.id} 
                variants={itemVariants}
                className="flex items-end shrink-0 snap-start relative pl-16 w-52 md:w-64 h-56 md:h-72"
              >
                {/* Netflix-style Large Number overlay */}
                <div 
                  className="absolute left-0 bottom-[-16px] text-[150px] md:text-[200px] font-black leading-none select-none text-transparent stroke-white"
                  style={{
                    WebkitTextStroke: "4px rgba(255, 255, 255, 0.4)",
                    textShadow: "0 0 20px rgba(0,0,0,0.8)",
                    zIndex: 10
                  }}
                >
                  {idx + 1}
                </div>
                
                {/* Standard Movie Card container */}
                <div className="relative z-20 w-full h-full">
                  <MovieCard item={item} mediaType={mediaType} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            ref={rowRef}
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth pr-4 md:pr-12"
          >
            {items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                {layout === "landscape" ? (
                  <LandscapeCard item={item} mediaType={mediaType} />
                ) : (
                  <MovieCard item={item} mediaType={mediaType} />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Navigation Right Arrow */}
        {layout !== "grid" && (
          <motion.button
            onClick={() => handleScroll("right")}
            whileHover={{ scale: 1.08, x: 1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass-mid flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 border border-white/[0.08]"
            title="Scroll Right"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}
