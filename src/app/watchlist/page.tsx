"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Bookmark, Sparkles, LogIn } from "lucide-react";
import { FadeUp } from "@/components/AnimatedComponents";

import MovieCard from "@/components/MovieCard";

export default function WatchlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Your Watchlist Library — Plexoria";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Access your personal streaming library. Save and track your favorite movies, TV shows, and dramas on Plexoria.");
    }

    // Suppress auth lookup if supabase client is not loaded or missing
    try {
      import("@/lib/supabase").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
      });
    } catch (e) {
      console.warn("Supabase auth integration is inactive.", e);
    }

    // Fetch local watchlist items
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

  // Display user's local watchlist if items exist
  if (localItems.length > 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28 min-h-screen bg-black text-slate-300 relative z-10 select-none">
        <div className="flex items-center gap-2.5 border-l-[3px] border-[#EF4444] pl-3 mb-8">
          <Bookmark size={20} className="text-[#EF4444]" />
          <h1 className="text-2xl md:text-3xl font-black text-white leading-none">Your Watchlist</h1>
          <span className="text-xs font-bold text-slate-500 ml-2">({localItems.length} items)</span>
        </div>
        
        <FadeUp className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {localItems.map((item) => (
            <MovieCard key={item.id} item={item} mediaType={item.media_type} />
          ))}
        </FadeUp>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 relative z-10 select-none">
        <FadeUp className="liquid-glass p-8 max-w-md w-full flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
            <Bookmark size={20} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-white">Your Streaming Library</h1>
            <p className="text-xs text-gray-400 max-w-xs leading-normal">
              Sign in to save movies, shows, and custom playlists across your personal account directory.
            </p>
          </div>
          <Link 
            href="/login" 
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-white px-5 py-3 rounded-xl font-bold hover:shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all"
          >
            <LogIn size={16} /> Sign In to Account
          </Link>
        </FadeUp>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-28 min-h-screen bg-black text-slate-300 relative z-10 select-none">
      <div className="flex items-center gap-2.5 border-l-[3px] border-[#EF4444] pl-3 mb-8">
        <Bookmark size={20} className="text-[#EF4444]" />
        <h1 className="text-2xl md:text-3xl font-black text-white leading-none">Your Watchlist</h1>
      </div>
      
      <FadeUp className="text-center py-20 bg-white/2 border border-white/5 rounded-2xl max-w-md mx-auto p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-gray-400">
          <Sparkles size={18} />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-sm text-gray-300">Your Watchlist is empty</p>
          <p className="text-xs text-gray-500 max-w-xs leading-normal">
            Start cataloging by selecting the plus bookmark icons inside any movie details card.
          </p>
        </div>
        <Link 
          href="/discover" 
          className="text-xs font-semibold text-red-400 hover:text-white px-4 py-2 border border-white/10 hover:border-white/25 rounded-lg bg-white/3 transition-colors mt-2"
        >
          Discover Movies & Shows
        </Link>
      </FadeUp>
    </div>
  );
}
