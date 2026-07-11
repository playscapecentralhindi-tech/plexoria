"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaItem, PaginatedResponse } from "@/lib/tmdb";
import MovieCard, { SkeletonCard } from "./MovieCard";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface MediaRowProps {
  title: string;
  fetchFn: () => Promise<PaginatedResponse<MediaItem>>;
  mediaType: "movie" | "tv";
}

export default function MediaRow({ title, fetchFn, mediaType }: MediaRowProps) {
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
      className="relative py-6 pl-4 md:pl-12 group select-none overflow-hidden"
    >
      {/* Title */}
      <div className="flex items-center justify-between pr-4 md:pr-12 mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-white flex items-center tracking-wide border-l-4 border-[#EF4444] pl-3">
          {title}
        </h2>
        <Link 
          href={mediaType === "movie" ? "/discover?type=movie" : "/discover?type=tv"} 
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#EF4444] transition-colors font-medium group/viewall"
        >
          <span>View All</span>
          <ChevronRight size={14} className="group-hover/viewall:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Row Wrapper */}
      <div className="relative w-full">
        {/* Navigation Left Arrow */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-30"
          title="Scroll Left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Horizontal Scrollable Row */}
        {isLoading ? (
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide pr-4 md:pr-12">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
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
                <MovieCard item={item} mediaType={mediaType} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Navigation Right Arrow */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-30"
          title="Scroll Right"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.section>
  );
}
