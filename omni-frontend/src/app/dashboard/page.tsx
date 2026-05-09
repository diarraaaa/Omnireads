"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Star, Clock, Book as BookIcon, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn: string;
  description: string;
  library_status?: string;
  user_rating?: number | null;
}

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [stats, setStats] = useState<{ average_rating: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [libraryData, profileData, recsData] = await Promise.all([
          api.get("/api/library/"),
          api.get("/api/profile/"),
          api.get("/api/recommendations/inbox/").catch(() => [])
        ]);
        
        // Map LibraryItem[] to Book[] for display
        const libraryBooks = libraryData.map((item: any) => ({
          ...item.book,
          library_status: item.status,
          user_rating: item.user_rating
        }));
        setBooks(libraryBooks);
        setRecommendations(recsData);
        setStats(profileData.stats);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
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
        <p className="text-foreground/40 font-serif italic">Accessing the stacks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="relative overflow-hidden p-10 rounded-3xl bg-card-bg border border-foreground/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <h2 className="text-5xl font-serif font-bold tracking-tight text-foreground mb-4">Your Library</h2>
          <p className="text-foreground/40 italic font-serif text-lg max-w-2xl">A personal collection of books you've added, read, and recommended.</p>
        </div>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard icon={<BookIcon className="w-5 h-5 text-accent-gold" />} label="Total Books" value={books.length.toString()} />
        <StatCard icon={<Star className="w-5 h-5 text-accent-gold" />} label="Average Rating" value={stats?.average_rating?.toFixed(1) || "0.0"} />
        <StatCard icon={<Clock className="w-5 h-5 text-accent-green" />} label="Currently Reading" value={books.filter(b => (b as any).library_status === 'reading').length.toString()} />
        <StatCard icon={<ChevronRight className="w-5 h-5 text-accent-gold" />} label="Finished Books" value={books.filter(b => (b as any).library_status === 'completed').length.toString()} />
      </div>

      {/* Received Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
            <h3 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
              <Star className="text-accent-gold animate-pulse" /> Direct Recommendations
            </h3>
            <p className="text-xs text-foreground/40 italic font-serif">Recommendations from your friends.</p>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
            {recommendations.map((rec, idx) => (
              <motion.div 
                key={rec.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex-shrink-0 w-80 bg-card-bg border border-foreground/5 rounded-3xl p-6 flex gap-4 hover:border-accent-gold/30 transition-all shadow-sm"
              >
                <div className="w-24 h-36 rounded-xl overflow-hidden shadow-lg border border-foreground/10 shrink-0">
                  <img src={rec.book.cover_url} alt={rec.book.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-foreground line-clamp-2">{rec.book.title}</h4>
                    <p className="text-[10px] text-foreground/40 italic truncate mt-1">From {rec.from_user_username}</p>
                  </div>
                  <div className="mt-2 text-[11px] text-foreground/60 line-clamp-3 italic font-serif leading-relaxed">
                    "{rec.message || "A book you might like."}"
                  </div>
                  <Link 
                    href={`/dashboard/books/${rec.book.id}`}
                    className="mt-4 text-[10px] font-black text-accent-gold uppercase tracking-widest hover:underline"
                  >
                    View Book
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Library Shelf Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <h3 className="text-2xl font-serif font-bold text-foreground">Recently Added</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-foreground/5 text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-accent-gold transition-colors">By Title</button>
            <button className="px-4 py-2 rounded-lg bg-foreground/5 text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-accent-gold transition-colors">By Author</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {books.map((book, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={book.id} 
              className="group flex flex-col"
            >
              <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-accent-gold/20">
                {/* Book Spine Shadow */}
                <div className="absolute inset-y-0 left-0 w-4 bg-black/30 z-10" />
                
                {book.cover_url ? (
                  <img 
                    src={book.cover_url} 
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2c1e14] to-[#1a120c]">
                    <BookIcon className="w-12 h-12 text-accent-gold opacity-20" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-20">
                   <div className="px-3 py-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-accent-gold uppercase tracking-widest">
                      {(book as any).library_status?.replace(/_/g, ' ') || 'Collection'}
                   </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                   <Link 
                      href={`/dashboard/books/${book.id}`}
                      className="w-full py-3 bg-accent-gold text-background text-xs font-bold uppercase tracking-[0.2em] rounded-lg text-center hover:bg-white transition-colors"
                    >
                      View Details
                    </Link>
                </div>
              </div>
              
              <div className="mt-6 space-y-1">
                <h3 className="text-xl font-serif font-bold text-foreground line-clamp-1 group-hover:text-accent-gold transition-colors">
                  {book.title}
                </h3>
                <p className="text-foreground/40 text-sm font-serif italic">by {book.author}</p>
                {book.user_rating ? (
                  <div className="flex items-center gap-1 pt-2">
                     {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < book.user_rating! ? "text-accent-gold fill-accent-gold" : "text-foreground/10"}`} />
                     ))}
                  </div>
                ) : (
                  <div className="pt-2 h-5" /> // Maintain spacing
                )}
              </div>
            </motion.div>
          ))}

          {/* Add New Book Placeholder */}
          <Link 
            href="/dashboard/discover"
            className="group flex flex-col items-center justify-center aspect-[2/3] bg-foreground/5 border-2 border-dashed border-foreground/10 rounded-2xl hover:border-accent-gold/30 hover:bg-foreground/10 transition-all duration-500 shadow-inner"
          >
            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-accent-gold/20 shadow-xl">
              <Plus className="w-8 h-8 text-foreground/20 group-hover:text-accent-gold" />
            </div>
            <p className="text-foreground/40 font-serif font-bold text-sm group-hover:text-accent-gold transition-colors uppercase tracking-widest">Add New Book</p>
          </Link>
        </div>
      </div>

      {books.length === 0 && !loading && (
        <div className="text-center py-20 bg-card-bg border border-foreground/5 rounded-3xl">
          <div className="w-20 h-20 bg-accent-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <BookIcon className="w-10 h-10 text-accent-gold" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-foreground mb-2">Your library is empty</h3>
          <p className="text-foreground/40 mb-8 max-w-md mx-auto italic font-serif">Start your collection by adding some books you love.</p>
          <Link 
            href="/dashboard/discover"
            className="px-8 py-3 rounded-xl bg-accent-green text-white font-bold hover:bg-accent-green/90 transition-all shadow-lg shadow-accent-green/20 active:scale-95 inline-block"
          >
            Add Books
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card-bg border border-foreground/5 hover:border-accent-gold/20 transition-colors group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2.5 bg-foreground/5 rounded-xl group-hover:bg-accent-gold/10 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-3xl font-serif font-bold text-foreground">{value}</p>
    </div>
  );
}
