"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Bookmark, Sparkles, LogIn, CloudOff, Trash2 } from "lucide-react";
import { FadeUp } from "@/components/AnimatedComponents";
import { motion } from "framer-motion";
import MovieCard from "@/components/MovieCard";

export default function WatchlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    document.title = "Your Watchlist — Plexoria";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Access your personal streaming library. Save and track your favorite movies, TV shows, and dramas on Plexoria."
      );
    }

    // Try Supabase auth
    try {
      import("@/lib/supabase").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
          setUser(data.user);
          if (data.user) setIsGuest(false);
        });
      });
    } catch (e) {
      console.warn("Supabase auth integration is inactive.", e);
    }

    // Load local watchlist
    try {
      const stored = localStorage.getItem("plexoria_watchlist");
      if (stored) {
        const watchlistMap = JSON.parse(stored);
        setLocalItems(Object.values(watchlistMap));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearItem = (id: number, mediaType: string) => {
    try {
      const stored = localStorage.getItem("plexoria_watchlist") || "{}";
      const map = JSON.parse(stored);
      delete map[`${id}_${mediaType}`];
      localStorage.setItem("plexoria_watchlist", JSON.stringify(map));
      setLocalItems(Object.values(map));
    } catch (e) {
      console.error(e);
    }
  };

  // Show watchlist (guest or signed-in)
  if (localItems.length > 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28 min-h-screen text-slate-300 relative z-10 select-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5 border-l-[3px] border-[#EF4444] pl-3">
            <Bookmark size={20} className="text-[#EF4444]" />
            <h1 className="text-2xl md:text-3xl font-black text-white leading-none">My Watchlist</h1>
            <span className="text-xs font-bold text-slate-500 ml-2">({localItems.length} titles)</span>
          </div>
        </div>

        {/* Guest sync banner */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl glass-card border border-white/5 mb-8 text-sm"
          >
            <CloudOff size={16} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-slate-300 font-semibold">Saved locally — </span>
              <span className="text-slate-400">sign in to sync across devices and never lose your list.</span>
            </div>
            <Link
              href="/login"
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg glass-btn-primary transition-all"
            >
              <LogIn size={12} /> Sign In
            </Link>
          </motion.div>
        )}

        {/* Grid */}
        <FadeUp className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {localItems.map((item) => (
            <div key={`${item.id}_${item.media_type}`} className="relative group">
              <MovieCard item={item} mediaType={item.media_type} />
              <button
                onClick={(e) => { e.preventDefault(); clearItem(item.id, item.media_type); }}
                className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/70 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Remove from watchlist"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </FadeUp>
      </div>
    );
  }

  // Empty / not signed in
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 relative z-10 select-none">
      <FadeUp className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-5 rounded-2xl border border-white/5">
        <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
          <Bookmark size={24} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-white">Your Streaming Library</h1>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Bookmark movies and TV shows to watch later. Your list saves locally — sign in to sync across devices.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 glass-btn-primary text-white px-5 py-3 rounded-xl font-bold transition-all"
          >
            <LogIn size={16} /> Sign In to Sync
          </Link>
          <Link
            href="/discover"
            className="w-full flex items-center justify-center gap-2 glass-btn-secondary text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Sparkles size={14} /> Discover Titles
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
