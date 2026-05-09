"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  Star, 
  ArrowLeft, 
  Book as BookIcon, 
  MessageSquare, 
  Share2, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  Plus,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import RecommendationModal from "@/components/RecommendationModal";
import BookReviews from "@/components/BookReviews";
import { useToast } from "@/components/ui/Toast";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn: string;
  description: string;
  genre: string;
}

interface Rating {
  score: number;
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isRecommendModalOpen, setRecommendModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookData, ratingsData] = await Promise.all([
          api.get(`/api/books/${id}/`),
          api.get(`/api/ratings/user/me/`).catch(() => []) // We'll need to implement /api/ratings/user/me/
        ]);
        setBook(bookData);
        // Find the rating for this specific book if it exists
        const currentRating = ratingsData.find((r: any) => r.book?.id === id || r.book === id);
        if (currentRating) setUserRating(currentRating.score);

        // Fetch library status for this book
        const libraryItems = await api.get("/api/library/");
        const currentItem = libraryItems.find((item: any) => item.book.id === id);
        if (currentItem) setLibraryStatus(currentItem.status);
      } catch (error) {
        console.error("Failed to fetch book details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRate = async (score: number) => {
    setRatingLoading(true);
    try {
      await api.post("/api/ratings/", { book_id: id, score });
      setUserRating(score);
      addToast({ title: "Your appraisal has been recorded.", type: "success" });
    } catch (error: any) {
      console.error("Failed to rate book:", error);
      addToast({ 
        title: "Action Forbidden", 
        description: error.message || "Ensure you have marked this volume as 'Completed'.", 
        type: "error" 
      });
    } finally {
      setRatingLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setStatusLoading(true);
    try {
      await api.post("/api/library/", { book_id: id, status });
      setLibraryStatus(status);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-12 h-12 text-accent-gold animate-spin mb-4" />
        <p className="text-foreground/40 font-serif italic">Fetching archives...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20">
        <h3 className="text-2xl font-serif font-bold text-foreground mb-4">Volume not found</h3>
        <button onClick={() => router.back()} className="text-accent-gold font-bold italic underline">Return to Stacks</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-foreground/40 hover:text-accent-gold transition-colors mb-10 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-[0.2em] text-[10px]">Return to Library</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Column: Cover and Status */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl shadow-accent-green/10 border border-foreground/5 relative group"
          >
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-card-bg flex items-center justify-center">
                <BookIcon className="w-20 h-20 text-foreground/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </motion.div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.3em] ml-1">Archive Status</h4>
            <div className="grid grid-cols-1 gap-3">
              <StatusButton 
                active={libraryStatus === 'reading'} 
                loading={statusLoading}
                onClick={() => handleUpdateStatus('reading')}
                icon={<CheckCircle2 className="w-4 h-4" />} 
                label="Currently Perusing" 
                color="green" 
              />
              <StatusButton 
                active={libraryStatus === 'plan_to_read'} 
                loading={statusLoading}
                onClick={() => handleUpdateStatus('plan_to_read')}
                icon={<Plus className="w-4 h-4" />} 
                label="Plan to Read" 
                color="slate" 
              />
              <StatusButton 
                active={libraryStatus === 'completed'} 
                loading={statusLoading}
                onClick={() => handleUpdateStatus('completed')}
                icon={<CheckCircle2 className="w-4 h-4" />} 
                label="Completed" 
                color="emerald" 
              />
            </div>
          </div>
        </div>

        {/* Right Column: Info and Social */}
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
               {book.genre?.split(",").map(g => (
                 <span key={g} className="px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-[10px] font-bold uppercase tracking-wider">
                   {g.trim()}
                 </span>
               ))}
            </div>
            <h1 className="text-5xl font-serif font-extrabold tracking-tight text-foreground leading-tight">
              {book.title}
            </h1>
            <p className="text-2xl text-foreground/40 font-medium italic">by {book.author}</p>
          </section>

          <section className="p-8 rounded-3xl bg-card-bg border border-foreground/5 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-serif font-bold text-foreground">Add Your Appraisal</h4>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    disabled={ratingLoading}
                    onClick={() => handleRate(star)}
                    className="p-1 group transition-transform active:scale-90 disabled:opacity-50"
                  >
                    <Star 
                      className={`w-8 h-8 transition-all ${
                        (userRating || 0) >= star 
                          ? "text-accent-gold fill-accent-gold" 
                          : "text-foreground/10 hover:text-foreground/30"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-xl font-serif font-bold text-foreground border-l-4 border-accent-green pl-4">Manifest</h4>
            <p className="text-lg text-foreground/60 leading-relaxed whitespace-pre-wrap font-serif">
              {book.description || "The archives are silent on this particular volume."}
            </p>
          </section>

          <div className="flex flex-wrap gap-4 pt-6 border-t border-foreground/5">
              <button 
                onClick={() => setRecommendModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold transition-all"
              >
                <Share2 className="w-5 h-5" />
                Recommend to Colleague
              </button>
          </div>

          <section className="pt-12">
            <BookReviews bookId={id} bookTitle={book.title} />
          </section>

          <RecommendationModal 
            isOpen={isRecommendModalOpen}
            onClose={() => setRecommendModalOpen(false)}
            bookId={book.id}
            bookTitle={book.title}
          />

          {/* Phase 2: AI Recommendations Stub */}
          <section className="p-10 rounded-[2.5rem] bg-gradient-to-br from-accent-green/10 to-accent-gold/10 border border-accent-gold/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles className="w-32 h-32 text-accent-gold" />
             </div>
             <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 text-accent-gold">
                   <Sparkles className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-[0.4em]">Future Insights</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground">Why you'll love it</h3>
                <p className="text-foreground/60 max-w-xl font-serif italic">
                   The Digital Librarian is analyzing your circle's appraisals. Based on your interest in <span className="text-accent-gold font-bold">{book.genre}</span>, we'll soon unveil personalized literary revelations.
                </p>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusButton({ icon, label, color, onClick, active = false, loading = false }: { icon: React.ReactNode, label: string, color: string, onClick?: () => void, active?: boolean, loading?: boolean }) {
  const colors: Record<string, string> = {
    green: "bg-accent-green/5 border-accent-green/20 text-accent-green hover:bg-accent-green/10",
    emerald: "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20",
    slate: "bg-foreground/5 border-foreground/10 text-foreground/40 hover:bg-foreground/10"
  };

  const activeColors: Record<string, string> = {
    green: "bg-accent-green border-accent-green text-white shadow-lg shadow-accent-green/20",
    emerald: "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    slate: "bg-foreground border-foreground text-background"
  };

  return (
    <button 
      disabled={loading}
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all font-bold text-sm disabled:opacity-50 ${active ? activeColors[color] : colors[color]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
      {active && <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />}
    </button>
  );
}
