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
  layout?: "poster" | "landscape" | "grid";
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
      <div className="flex items-center justify-between pr-4 md:pr-12 mb-3">
        <h2 className="text-lg md:text-xl font-semibold text-white flex items-center tracking-wide border-l-4 border-[#E50914] pl-3">
          {title}
        </h2>
        <Link 
          href={mediaType === "movie" ? "/discover?type=movie" : "/discover?type=tv"} 
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#E50914] transition-colors font-medium group/viewall"
        >
          <span>View All</span>
          <ChevronRight size={14} className="group-hover/viewall:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Row Wrapper */}
      <div className="relative w-full">
        {/* Navigation Left Arrow */}
        {layout !== "grid" && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-30"
            title="Scroll Left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Horizontal Scrollable Row or Static Grid */}
        {isLoading ? (
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide pr-4 md:pr-12">
            {[...Array(6)].map((_, i) => (
              layout === "landscape" ? <SkeletonLandscapeCard key={i} /> : <SkeletonCard key={i} />
            ))}
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pr-4 md:pr-12">
            {items.map((item) => (
              <MovieCard key={item.id} item={item} mediaType={mediaType} />
            ))}
          </div>
        ) : (
          <motion.div
            ref={rowRef}
            variants={containerVariants}
            initial="hidden"
            animate="show"
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
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-30"
            title="Scroll Right"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </motion.section>
  );
}
