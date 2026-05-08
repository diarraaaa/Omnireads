"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Star, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Book as BookIcon, 
  User, 
  Clock, 
  ChevronRight,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Recommendation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_username?: string;
  to_user_username?: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string;
    description: string;
  };
  message: string;
  created_at: string;
}

export default function RecommendationsPage() {
  const [inbound, setInbound] = useState<Recommendation[]>([]);
  const [outbound, setOutbound] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inData, outData] = await Promise.all([
          api.get("/api/recommendations/inbox/"),
          api.get("/api/recommendations/sent/")
        ]);
        setInbound(inData);
        setOutbound(outData);
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-gold"></div>
        <p className="text-foreground/40 font-serif italic text-lg">Loading recommendations...</p>
      </div>
    );
  }

  const currentData = activeTab === "received" ? inbound : outbound;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <section className="relative overflow-hidden p-12 rounded-[40px] bg-card-bg border border-foreground/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-gold/5 blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-green/5 blur-[100px] -ml-36 -mb-36" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-[10px] font-black text-accent-gold uppercase tracking-[0.2em]">
                Recommendations
              </div>
            </div>
            <h1 className="text-6xl font-serif font-bold tracking-tight text-foreground">Book Suggestions</h1>
            <p className="text-foreground/40 italic font-serif text-xl max-w-xl leading-relaxed">
              Keep track of books you've shared with friends and suggestions you've received.
            </p>
          </div>
          
          <div className="flex bg-foreground/5 p-1.5 rounded-2xl border border-foreground/5 backdrop-blur-md shrink-0">
            <button 
              onClick={() => setActiveTab("received")}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-serif font-bold transition-all ${
                activeTab === "received" 
                  ? "bg-accent-gold text-white shadow-lg shadow-accent-gold/20" 
                  : "text-foreground/40 hover:text-foreground"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              From Friends
              {inbound.length > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "received" ? "bg-white/20" : "bg-foreground/10"}`}>
                  {inbound.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab("sent")}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-serif font-bold transition-all ${
                activeTab === "sent" 
                  ? "bg-accent-gold text-white shadow-lg shadow-accent-gold/20" 
                  : "text-foreground/40 hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Sent to Friends
              {outbound.length > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === "sent" ? "bg-white/20" : "bg-foreground/10"}`}>
                  {outbound.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="wait">
          {currentData.length > 0 ? (
            currentData.map((rec, idx) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-card-bg border border-foreground/5 rounded-[32px] p-8 hover:border-accent-gold/30 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-accent-gold/5 flex gap-8 overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  {activeTab === "received" ? <ArrowDownLeft className="w-24 h-24" /> : <ArrowUpRight className="w-24 h-24" />}
                </div>

                <div className="w-32 h-48 rounded-2xl overflow-hidden shadow-2xl border border-foreground/10 shrink-0 relative group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="absolute inset-y-0 left-0 w-3 bg-black/30 z-10" />
                  <img src={rec.book.cover_url} alt={rec.book.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-serif font-bold text-foreground line-clamp-2 leading-tight group-hover:text-accent-gold transition-colors">
                        {rec.book.title}
                      </h3>
                      <p className="text-foreground/40 text-sm font-serif italic">by {rec.book.author}</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/5 italic font-serif text-sm text-foreground/70 leading-relaxed relative">
                      <span className="absolute -top-2 -left-1 text-3xl text-accent-gold opacity-20 font-serif">"</span>
                      {rec.message || "I think you might enjoy this book!"}
                      <span className="absolute -bottom-4 -right-1 text-3xl text-accent-gold opacity-20 font-serif">"</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="text-[11px]">
                          <p className="font-bold text-foreground/30 uppercase tracking-widest leading-none mb-1">
                            {activeTab === "received" ? "From Friend" : "Sent To"}
                          </p>
                          <p className="font-serif font-bold text-foreground">
                            {activeTab === "received" ? rec.from_user_username : rec.to_user_username}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-foreground/20 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Date</span>
                        </div>
                        <p className="text-[11px] font-serif font-bold text-foreground/40">
                          {new Date(rec.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <Link 
                      href={`/dashboard/books/${rec.book.id}`}
                      className="flex-1 py-3.5 rounded-xl bg-foreground/5 border border-foreground/10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 hover:bg-accent-gold hover:text-white hover:border-accent-gold transition-all"
                    >
                      View Book
                    </Link>
                    <Link 
                      href={`/dashboard/messages?user=${activeTab === "received" ? rec.from_user_id : rec.to_user_id}`}
                      className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green hover:text-white transition-all group/btn"
                    >
                      <MessageSquare className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-32 text-center bg-card-bg border border-foreground/5 rounded-[40px] shadow-inner"
            >
              <div className="w-24 h-24 bg-accent-gold/5 rounded-full flex items-center justify-center mx-auto mb-8">
                <Star className="w-10 h-10 text-accent-gold/20" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-foreground mb-3">No Recommendations Yet</h3>
              <p className="text-foreground/40 italic font-serif text-lg max-w-md mx-auto">
                {activeTab === "received" ? "Ask your friends for recommendations" : "Share your favorite books with friends"} to see them here.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
