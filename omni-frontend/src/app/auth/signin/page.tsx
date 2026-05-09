"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";

export default function SignInPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      // Zero-Config Mode: Just go to dashboard
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage("Please enter your email first.");
      return;
    }
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    setMessage(error ? error.message : "Check your email for the magic link!");
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(74,93,35,0.1),transparent_50%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-card-bg/80 backdrop-blur-xl p-8 rounded-2xl border border-foreground/10 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-accent-gold/10 rounded-xl border border-accent-gold/20">
              <BookOpen className="w-8 h-8 text-accent-gold" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">OmniReads</h1>
          <p className="text-foreground/60">Your sanctuary for the written word.</p>
        </div>

        <div className="flex bg-background/40 p-1 rounded-xl border border-foreground/5">
          <button 
            onClick={() => setIsSignUp(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${!isSignUp ? 'bg-accent-gold text-white shadow-lg' : 'text-foreground/40 hover:text-foreground/60'}`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button 
            onClick={() => setIsSignUp(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${isSignUp ? 'bg-accent-gold text-white shadow-lg' : 'text-foreground/40 hover:text-foreground/60'}`}
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </button>
        </div>

        {supabase && (
          <>
            <div className="space-y-4">
              <button 
                onClick={() => handleOAuth('google')}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              
              <button 
                onClick={() => handleOAuth('github')}
                className="w-full flex items-center justify-center gap-3 bg-[#24292e] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#2c3238] border border-white/5 transition-all active:scale-[0.98]"
              >
                <GithubIcon className="w-5 h-5" />
                Continue with GitHub
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card-bg px-2 text-foreground/40 font-medium italic">Or use credentials</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input 
                type="email" 
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background/50 border border-foreground/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 transition-all placeholder:text-foreground/20 text-foreground"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input 
                type="password" 
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-foreground/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 transition-all placeholder:text-foreground/20 text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-accent-green hover:bg-accent-green/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(74,93,35,0.2)] transition-all active:scale-[0.98]"
            >
              {!supabase ? "Enter Developer Mode" : (loading ? "Authenticating..." : (isSignUp ? "Sign Up" : "Sign In"))}
            </button>
            
            {!supabase && (
              <p className="text-center text-xs text-foreground/40 px-4">
                Zero-Config Mode: Supabase keys are missing. You can enter the dashboard as a mock developer.
              </p>
            )}

            {supabase && !isSignUp && (
              <button 
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full bg-transparent border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/5 font-medium py-2 rounded-xl transition-all text-sm"
              >
                Send Magic Link instead
              </button>
            )}
          </div>
        </form>

        {message && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-accent-gold font-medium italic"
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
