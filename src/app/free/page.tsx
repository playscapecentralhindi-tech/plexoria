"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import Link from "next/link";
import { Play, Film, Sparkles } from "lucide-react";
import MovieCard, { SkeletonCard } from "@/components/MovieCard";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/AnimatedComponents";

const YOUTUBE_FREE_MOVIES = [
  { id: "Tgb1hOiyB54", title: "Mutiny on the Bounty", studio: "Warner Bros Classics" },
  { id: "z6zDytY-3c0", title: "The Mission", studio: "Warner Bros Archive" },
  { id: "oHg5SJYRHA0", title: "Never Surrender", studio: "Lionsgate Free Hub" },
];

export default function FreePage() {
  useEffect(() => {
    document.title = "Free Streaming Channels — Plexoria";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Watch free, legal streaming movies and TV channels. Access public domain classics and official studio showcase playlists online.");
    }
  }, []);
  const { data: freeRightNow, isLoading: isFreeLoading } = useQuery({
    queryKey: ["discover", "free", "us"],
    queryFn: () => tmdb.discover("movie", {
      watch_region: "US",
      with_watch_monetization_types: "free|ads",
      sort_by: "popularity.desc"
    }),
  });

  const { data: archiveMovies, isLoading: isArchiveLoading } = useQuery({
    queryKey: ["archive", "classics"],
    queryFn: async () => {
      const res = await fetch("https://archive.org/advancedsearch.php?q=collection:feature_films+AND+mediatype:movies+AND+downloads:[50000+TO+10000000]&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&output=json&rows=8");
      return res.json();
    }
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 select-none relative z-10 text-slate-300 bg-black">
      
      {/* Header with gradient text glow */}
      <FadeUp className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-wide" style={{ textShadow: "0 0 35px rgba(239,68,68,0.15)" }}>
          Watch Free & Legal
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
          No subscriptions needed. Discover thousands of free titles available with ads across major legal platforms, plus classic public domain films you can play right here.
        </p>
      </FadeUp>

      {/* Section 1: Free Right Now (TMDB) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-l-[3px] border-[#EF4444] pl-3 mb-6">
          <Film className="text-[#EF4444]" size={16} />
          <h2 className="text-lg md:text-xl font-extrabold text-white">Free Right Now (Tubi, Pluto TV, Freevee)</h2>
        </div>
        
        {isFreeLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
          >
            {freeRightNow?.results?.map((item: any) => (
              <motion.div key={item.id} variants={itemVariants}>
                <MovieCard item={item} mediaType="movie" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Section 2: Internet Archive (Public Domain) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-l-[3px] border-[#EF4444] pl-3 mb-6">
          <Sparkles className="text-[#EF4444]" size={16} />
          <h2 className="text-lg md:text-xl font-extrabold text-white">Public Domain Classics (Play Inline)</h2>
        </div>
        
        {isArchiveLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
             {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 border border-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {archiveMovies?.response?.docs?.map((doc: any) => (
              <motion.div key={doc.identifier} variants={itemVariants} className="group flex flex-col gap-2">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5 liquid-glass shadow-lg">
                  <iframe 
                    src={`https://archive.org/embed/${doc.identifier}`} 
                    className="w-full h-full border-0" 
                    allowFullScreen 
                    title={doc.title}
                    loading="lazy"
                  ></iframe>
                </div>
                <div className="space-y-0.5 px-1">
                  <p className="font-bold text-xs md:text-sm line-clamp-1 text-white">{doc.title}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{doc.year || "Public Domain"}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Section 3: Official YouTube Free Uploads */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-l-[3px] border-[#EF4444] pl-3 mb-6">
          <Play className="text-[#EF4444]" size={16} />
          <h2 className="text-lg md:text-xl font-extrabold text-white">Studio Showcase Channels (YouTube)</h2>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        >
          {YOUTUBE_FREE_MOVIES.map((movie) => (
            <motion.div key={movie.id} variants={itemVariants} className="flex flex-col gap-2">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/5 liquid-glass shadow-lg">
                <iframe 
                  src={`https://www.youtube.com/embed/${movie.id}`} 
                  className="w-full h-full border-0" 
                  allowFullScreen 
                  title={movie.title}
                  loading="lazy"
                ></iframe>
              </div>
              <div className="space-y-0.5 px-1">
                <p className="font-bold text-xs md:text-sm line-clamp-1 text-white">{movie.title}</p>
                <p className="text-[10px] text-red-400 font-semibold">{movie.studio}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

    </div>
  );
}
