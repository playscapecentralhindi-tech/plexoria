"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

export default function NotFound() {
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.endsWith(".html")) {
        const cleanPath = path.substring(0, path.length - 5);
        window.location.replace(cleanPath + window.location.search);
        return;
      }
      setIsRedirecting(false);
    }
  }, []);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden z-10">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film size={28} className="text-[#EF4444] animate-pulse" />
          <span className="text-xl font-black text-white tracking-wider uppercase">Plexoria</span>
        </div>

        <h1 className="text-8xl font-black text-white leading-none tracking-tighter">404</h1>
        
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">Page Not Found</h2>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            The page you are looking for does not exist, has been moved, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#D32F2F] text-xs font-bold text-white shadow-lg shadow-red-500/15 hover:shadow-red-500/25 transition-all hover:scale-105 active:scale-98 duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
