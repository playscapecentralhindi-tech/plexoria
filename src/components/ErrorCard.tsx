"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
  compact?: boolean;
}

export default function ErrorCard({
  title = "Something went wrong",
  message = "This title is temporarily unavailable. Please try again.",
  onRetry,
  showHomeLink = true,
  compact = false,
}: ErrorCardProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    await new Promise((res) => setTimeout(res, 600));
    onRetry();
    setRetrying(false);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-4 ${
        compact ? "py-10 px-6" : "min-h-[60vh] py-20 px-4"
      }`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="flex flex-col items-center gap-4 max-w-sm w-full"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-400" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1">
          {onRetry && (
            <motion.button
              onClick={handleRetry}
              disabled={retrying}
              whileTap={{ scale: 0.97 }}
              className="glass-btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            >
              <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
              {retrying ? "Retrying..." : "Try Again"}
            </motion.button>
          )}
          {showHomeLink && (
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white border border-white/5 hover:border-white/15 bg-white/3 hover:bg-white/8 transition-all"
            >
              <Home size={14} />
              Home
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
