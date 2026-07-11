"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="min-h-[85vh] flex items-center justify-center pt-20 px-4 select-none relative z-10">
      <div className="max-w-md w-full liquid-glass p-8 border border-white/10 shadow-2xl space-y-6">
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white" style={{ textShadow: "0 0 30px rgba(239,68,68,0.2)" }}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-gray-400">
            {isLogin ? "Sign in to resume catalog tracking" : "Register a new profile for streaming logs"}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-xs font-medium text-white rounded-xl p-3 focus:outline-none focus:border-[#EF4444]"
              placeholder="name@domain.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/60 border border-white/10 text-xs font-medium text-white rounded-xl p-3 focus:outline-none focus:border-[#EF4444]"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#B91C1C] text-white font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all disabled:opacity-50 mt-2"
          >
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            <span>{loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}</span>
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-white hover:text-red-400 hover:underline font-bold transition-colors"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
