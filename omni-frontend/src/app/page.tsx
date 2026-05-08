"use client";

import { motion } from "framer-motion";
import { BookOpen, Users, Star, ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent-gold/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent-green rounded-lg">
              <BookOpen className="w-5 h-5 text-background" />
            </div>
            <span className="text-xl font-bold tracking-tight font-serif italic text-accent-gold">OmniReads</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/signin" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link 
              href="/auth/signin" 
              className="px-4 py-2 bg-accent-gold text-background text-sm font-bold rounded-full hover:bg-accent-gold/90 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-accent-green/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-4xl mx-auto text-center space-y-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="px-4 py-1.5 rounded-full border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-xs font-bold uppercase tracking-widest">
                The Digital Archives — Phase 1 Live
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-6xl md:text-7xl font-serif font-extrabold tracking-tight leading-[1.1]"
            >
              Curate. Review. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-gold to-[#c5a059]">
                Congregate.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed"
            >
              A sanctuary for the modern reader. Track your collection, 
              find your literary circle, and preserve the stories that matter.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/auth/signin"
                className="group w-full sm:w-auto px-8 py-4 bg-accent-green rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(74,93,35,0.2)] hover:shadow-[0_0_40px_rgba(74,93,35,0.4)] transition-all active:scale-95 text-white"
              >
                Enter the Archives
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="https://github.com" 
                target="_blank"
                className="w-full sm:w-auto px-8 py-4 bg-foreground/5 border border-foreground/10 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-foreground/10 transition-all active:scale-95 text-foreground"
              >
                <GithubIcon className="w-5 h-5" />
                View Repository
              </a>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Star className="w-6 h-6 text-accent-gold" />}
              title="Personal Ratings"
              description="Keep track of every volume in your collection with our refined rating system."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-accent-green" />}
              title="Social Connections"
              description="Invite colleagues to witness your readings and share silent recommendations."
            />
            <FeatureCard 
              icon={<BookOpen className="w-6 h-6 text-accent-gold" />}
              title="AI Discovery"
              description="Our Phase 2 engine will unveil your next obsession through the lens of history."
            />
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>© 2026 OmniReads. Built with Next.js, Django, and Supabase.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl bg-card-bg border border-foreground/5 hover:border-accent-gold/20 transition-all group"
    >
      <div className="p-3 bg-foreground/5 w-fit rounded-2xl mb-6 group-hover:bg-accent-gold/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-serif font-bold mb-2">{title}</h3>
      <p className="text-foreground/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}
