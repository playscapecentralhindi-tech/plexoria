"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/AnimatedComponents";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.title = isLogin ? "Sign In — Plexoria" : "Create Account — Plexoria";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Access your personal Plexoria account library to resume playing, save watchlist movies, and manage catalog settings.");
    }
  }, [isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: email.split("@")[0] }
          }
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      }
    } catch (err: any) {
      setError(err.message || "Authentication integration is currently local-only.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-28 pb-20 px-4 select-none relative z-10 text-slate-300">
      <FadeUp className="max-w-md w-full liquid-glass p-8 border border-white/5 shadow-2xl space-y-6">
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white" style={{ textShadow: "0 0 35px rgba(239,68,68,0.15)" }}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-slate-400 font-semibold">
            {isLogin ? "Sign in to resume catalog tracking" : "Register a new profile for streaming logs"}
          </p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/55 border border-white/5 text-xs font-semibold text-white rounded-xl p-3 focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 placeholder-slate-600 transition-all"
              placeholder="name@domain.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/55 border border-white/5 text-xs font-semibold text-white rounded-xl p-3 focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 placeholder-slate-600 transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-white font-extrabold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all disabled:opacity-50 mt-2 active:scale-98"
          >
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            <span>{loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 font-semibold">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#EF4444] hover:text-red-400 hover:underline font-extrabold transition-colors ml-0.5"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>

        <div className="border-t border-white/5 pt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
          >
            Continue browsing without account →
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
