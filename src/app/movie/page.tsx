"use client";

import MediaDetail from "@/components/MediaDetail";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

function MoviePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-slate-300 gap-4 px-4 select-none">
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-white/10">
          <Film size={36} className="text-[#EF4444] mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-white">No Movie Selected</h2>
          <p className="text-xs text-slate-400">Please select a movie from our featured spotlight or explore the catalog.</p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            <Link href="/" className="glass-btn-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl">
              Go to Home
            </Link>
            <Link href="/discover" className="glass-btn-secondary text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl">
              Discover Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <MediaDetail mediaType="movie" id={id} />;
}

export default function MoviePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin" />
      </div>
    }>
      <MoviePageContent />
    </Suspense>
  );
}
