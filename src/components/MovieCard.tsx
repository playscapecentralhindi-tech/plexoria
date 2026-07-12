"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import { motion } from "framer-motion";
import { MediaItem } from "@/lib/tmdb";

interface MovieCardProps {
  item: MediaItem;
  mediaType?: "movie" | "tv" | "person";
}

export default function MovieCard({ item, mediaType }: MovieCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const targetType = item.media_type || mediaType || "movie";
  const titleText = item.title || item.name || "Untitled";
  const year = (item.release_date || item.first_air_date || "").substring(0, 4);

  return (
    <Link href={`/${targetType}?id=${item.id}`} className="block select-none shrink-0 w-36 md:w-48 snap-start">
      <motion.div
        whileHover={{ 
          scale: 1.05,
          y: -8,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(229, 9, 20, 0.25)"
        }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#12121A] card-sweep group shadow-lg"
      >
        {/* Poster Image */}
        {item.poster_path ? (
          <>
            <img
              src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              alt={titleText}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#12121A] animate-shimmer"></div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-center p-4 bg-gradient-to-b from-[#181822] to-[#0E0E15] border border-white/5 relative">
            <span className="text-[#E50914] text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60">Plexoria</span>
            <span className="text-white font-extrabold text-[10px] leading-snug line-clamp-3 px-1">{titleText}</span>
            <div className="absolute bottom-4 text-[8px] text-gray-500 font-bold uppercase tracking-wider">No Poster</div>
          </div>
        )}

        {/* Play Icon Overlay Hover Sweep */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-red-600/35 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={20} className="fill-current ml-0.5" />
          </div>
        </div>

        {/* Corner Badge Top Left */}
        {year && (parseInt(year) >= 2025) ? (
          <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-[#E50914] text-[9px] font-bold text-white shadow-md tracking-wider">
            NEW
          </div>
        ) : item.vote_average >= 7.2 ? (
          <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-[#E50914] text-[9px] font-bold text-white shadow-md tracking-wider">
            HD
          </div>
        ) : null}

        {/* Rating Gold Badge Top Right */}
        {item.vote_average > 0 && (
          <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-0.5 text-[9px] font-bold text-[#FBBF24]">
            <Star size={10} fill="currentColor" /> {item.vote_average.toFixed(1)}
          </div>
        )}

        {/* Dark Glass Overlay details block */}
        <div className="absolute bottom-0 left-0 w-full p-2.5 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex flex-col gap-0.5 z-20">
          <span className="text-xs font-semibold truncate text-white drop-shadow">
            {titleText}
          </span>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{year || "N/A"}</span>
            <span className="uppercase text-[9px] tracking-wider px-1 bg-white/5 border border-white/10 rounded">
              {targetType}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Shimmering Skeleton Loader version for movie card
export function SkeletonCard() {
  return (
    <div className="w-36 md:w-48 shrink-0 aspect-[2/3] rounded-xl bg-[#12121A] border border-white/5 animate-shimmer relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col gap-2 bg-[#0A0A0F]/60">
        <div className="w-4/5 h-3 bg-white/10 rounded"></div>
        <div className="w-1/2 h-2.5 bg-white/10 rounded"></div>
      </div>
    </div>
  );
}

// Premium 16:9 Landscape Card version
export function LandscapeCard({ item, mediaType }: MovieCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const targetType = item.media_type || mediaType || "movie";
  const titleText = item.title || item.name || "Untitled";
  const year = (item.release_date || item.first_air_date || "").substring(0, 4);

  return (
    <Link href={`/${targetType}?id=${item.id}`} className="block select-none shrink-0 w-52 md:w-72 snap-start">
      <motion.div
        whileHover={{ 
          scale: 1.05,
          y: -6,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(229, 9, 20, 0.25)"
        }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#12121A] card-sweep group shadow-lg"
      >
        {/* Background Image */}
        {item.backdrop_path ? (
          <>
            <img
              src={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
              alt={titleText}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#12121A] animate-shimmer"></div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-center p-4 bg-gradient-to-b from-[#181822] to-[#0E0E15] border border-white/5 relative">
            <span className="text-[#E50914] text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-60">Plexoria</span>
            <span className="text-white font-extrabold text-xs leading-snug line-clamp-2 px-1">{titleText}</span>
          </div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="w-10 h-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-red-600/35 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={16} className="fill-current ml-0.5" />
          </div>
        </div>

        {/* Corner Badge */}
        {item.vote_average > 0 && (
          <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-0.5 text-[9px] font-bold text-[#FBBF24]">
            <Star size={10} fill="currentColor" /> {item.vote_average.toFixed(1)}
          </div>
        )}

        {/* Info Overlay bottom */}
        <div className="absolute bottom-0 left-0 w-full p-2.5 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex flex-col gap-0.5 z-20">
          <span className="text-xs font-semibold truncate text-white drop-shadow">
            {titleText}
          </span>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{year || "N/A"}</span>
            <span className="uppercase text-[9px] tracking-wider px-1 bg-white/5 border border-white/10 rounded">
              {targetType}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Shimmering Landscape Skeleton card
export function SkeletonLandscapeCard() {
  return (
    <div className="w-52 md:w-72 shrink-0 aspect-[16/9] rounded-xl bg-[#12121A] border border-white/5 animate-shimmer relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col gap-2 bg-[#0A0A0F]/60">
        <div className="w-3/5 h-3 bg-white/10 rounded"></div>
        <div className="w-1/3 h-2.5 bg-white/10 rounded"></div>
      </div>
    </div>
  );
}
