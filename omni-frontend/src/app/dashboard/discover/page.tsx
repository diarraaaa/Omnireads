"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Sparkles, BookOpen, ChevronRight, Loader2, Star, Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RecommendationModal from "@/components/RecommendationModal";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
}

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [trending, setTrending] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<{ results: Book[], count: number }>({ results: [], count: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [randomBook, setRandomBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [recommendBook, setRecommendBook] = useState<{id: string, title: string} | null>(null);

  const handleRecommend = (book: Book) => {
    setRecommendBook({ id: book.id, title: book.title });
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [trendingData, randomData, genresData] = await Promise.all([
          api.get("/api/books/trending/"),
          api.get("/api/books/random/").catch(() => null),
          api.get("/api/genres/").catch(() => [])
        ]);
        setTrending(trendingData);
        setRandomBook(randomData);
        setGenres(genresData);
      } catch (err) {
        console.error("Discovery fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function performSearch() {
      const isDiscoveryView = !searchQuery && !selectedGenre && !viewAll;
      if (isDiscoveryView) {
        setSearchResults({ results: [], count: 0 });
        return;
      }
      setSearching(true);
      try {
        const url = "/api/books/";
        const params = new URLSearchParams();
        if (searchQuery) params.append("q", searchQuery);
        if (selectedGenre) params.append("genre", selectedGenre);
        params.append("page", currentPage.toString());
        params.append("page_size", "50");
        
        const data = await api.get(`${url}?${params.toString()}`);
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }
    performSearch();
  }, [searchQuery, selectedGenre, viewAll, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, viewAll]);

  const refreshRandom = async () => {
    try {
      const data = await api.get("/api/books/random/");
      setRandomBook(data);
    } catch (err) {
      console.error("Random fetch failed:", err);
    }
  };

  const handleGenreClick = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null); // Deselect if already selected
    } else {
      setSelectedGenre(genre);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      <header>
        <h1 className="text-4xl font-serif font-bold text-foreground">
          {searchQuery ? `Searching for "${searchQuery}"` : selectedGenre ? `Archive: ${selectedGenre}` : "The Grand Catalog"}
        </h1>
        <p className="text-foreground/40 italic mt-2 font-serif">
          {searchQuery || selectedGenre
            ? `We've scoured the deep archives for volumes matching your request.` 
            : "Unearth new volumes and explore curated collections from across the archives."}
        </p>
      </header>

      {(searchQuery || selectedGenre || viewAll) && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-3 text-foreground">
              <Search className="text-accent-gold" /> {selectedGenre ? `Categorized as ${selectedGenre}` : "Retrieval Results"}
            </h2>
            {(selectedGenre || viewAll) && (
              <button 
                onClick={() => { setSelectedGenre(null); setViewAll(false); }}
                className="text-xs font-bold text-accent-gold hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>

          {searching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
            </div>
          ) : searchResults.results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {searchResults.results.map((book, idx) => (
                  <BookCard key={book.id} book={book} idx={idx} onRecommend={handleRecommend} />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {searchResults.count > 50 && (
                <div className="flex items-center justify-center gap-4 mt-12 pt-12 border-t border-foreground/5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-6 py-2 rounded-xl border border-foreground/10 text-foreground/60 hover:border-accent-gold hover:text-accent-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    Earlier Page
                  </button>
                  <span className="text-foreground/40 font-serif italic text-sm">
                    Folio {currentPage} of {Math.ceil(searchResults.count / 50)}
                  </span>
                  <button 
                    disabled={currentPage >= Math.ceil(searchResults.count / 50)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-6 py-2 rounded-xl border border-foreground/10 text-foreground/60 hover:border-accent-gold hover:text-accent-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    Next Folio
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-dashed border-foreground/10 bg-foreground/5">
              <BookOpen className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
              <p className="text-foreground/40 font-serif italic">No manuscripts found matching your query in the current archives.</p>
            </div>
          )}
        </section>
      )}

      {!searchQuery && !selectedGenre && !viewAll && (
        <>
          {/* Hero: Surprise Me */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-card-bg border border-foreground/5 p-8 md:p-12">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold/10 text-accent-gold text-[10px] font-bold uppercase tracking-[0.2em] border border-accent-gold/20">
              <Sparkles className="w-3 h-3" /> Serendipity
            </div>
            <h2 className="text-4xl font-serif font-bold text-foreground leading-tight">Seeking a mysterious encounter?</h2>
            <p className="text-foreground/60 text-lg leading-relaxed font-serif italic">
              Our automated curator is presently indexing the deep archives. Allow serendipity to guide your hand toward a random masterpiece.
            </p>
            <button 
              onClick={refreshRandom}
              className="flex items-center gap-3 bg-accent-green hover:bg-accent-green/90 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-accent-green/20 transition-all active:scale-95 group"
            >
              <span>Consult the Archive</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex justify-center md:justify-end">
            {randomBook ? (
              <motion.div
                key={randomBook.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <Link href={`/dashboard/books/${randomBook.id}`}>
                  <div className="relative w-48 h-72 md:w-56 md:h-84 overflow-hidden rounded-3xl shadow-2xl shadow-black/50 border border-foreground/10 group-hover:scale-105 transition-transform duration-700">
                    <img 
                      src={randomBook.cover_url || "https://images.unsplash.com/photo-1543004218-ee141104308a?q=80&w=1974&auto=format&fit=crop"} 
                      alt={randomBook.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                      <p className="text-lg font-serif font-bold text-white leading-tight">{randomBook.title}</p>
                      <p className="text-sm text-accent-gold mt-1 italic">by {randomBook.author}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <div className="w-48 h-72 bg-foreground/5 rounded-3xl border border-dashed border-foreground/10 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-foreground/10" />
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl" />
      </section>

      {/* Trending Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-3 text-foreground">
            <TrendingUp className="text-accent-gold" /> Trending Manuscripts
          </h2>
          <button 
            onClick={() => setViewAll(true)}
            className="text-foreground/40 hover:text-accent-gold text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trending.map((book, idx) => (
            <BookCard key={book.id} book={book} idx={idx} onRecommend={handleRecommend} />
          ))}
        </div>
      </section>

      {/* Categories / Genres */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-foreground text-glow">Shelve by Archive</h2>
          <button 
            onClick={() => setShowAllGenres(!showAllGenres)}
            className="text-accent-gold text-xs font-bold uppercase tracking-widest hover:underline transition-all"
          >
            {showAllGenres ? "Show Less" : "View All Genres"}
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(showAllGenres ? genres : genres.slice(0, 12)).map((genre) => (
            <div 
              key={genre}
              onClick={() => handleGenreClick(genre)}
              className={`p-4 rounded-xl bg-card-bg border transition-all cursor-pointer group text-center hover:scale-105 active:scale-95 ${
                selectedGenre === genre ? 'border-accent-gold bg-accent-gold/10' : 'border-foreground/5 hover:border-accent-gold/30 hover:bg-accent-gold/5'
              }`}
            >
              <p className={`font-serif font-bold text-xs transition-colors ${
                selectedGenre === genre ? 'text-accent-gold' : 'text-foreground/60 group-hover:text-accent-gold'
              }`}>{genre}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )}

      {recommendBook && (
        <RecommendationModal 
          isOpen={!!recommendBook}
          onClose={() => setRecommendBook(null)}
          bookId={recommendBook.id}
          bookTitle={recommendBook.title}
        />
      )}

    </div>
  );
}

function BookCard({ book, idx, onRecommend }: { book: Book, idx: number, onRecommend: (book: Book) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 shadow-lg border border-foreground/5 group-hover:border-accent-gold/30 transition-all duration-500">
        <Link href={`/dashboard/books/${book.id}`}>
          <img 
            src={book.cover_url || "https://images.unsplash.com/photo-1543004218-ee141104308a?q=80&w=1974&auto=format&fit=crop"} 
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </Link>
        <div className="absolute top-2 right-2 px-2 py-1 bg-accent-gold/80 backdrop-blur-md rounded-lg text-[8px] font-black text-white flex items-center gap-1 tracking-widest">
          <Star className="w-2.5 h-2.5 fill-white" /> POPULAR
        </div>
        
        {/* Recommendation Button Overlay */}
        <button 
          onClick={() => onRecommend(book)}
          className="absolute bottom-3 right-3 p-2.5 bg-background/80 backdrop-blur-md rounded-xl text-foreground/40 hover:text-accent-gold hover:bg-background transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 shadow-lg border border-foreground/5"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
      <Link href={`/dashboard/books/${book.id}`}>
        <h3 className="font-serif font-bold text-sm truncate text-foreground group-hover:text-accent-gold transition-colors">{book.title}</h3>
        <p className="text-xs text-foreground/40 italic truncate">{book.author}</p>
      </Link>
    </motion.div>
  );
}
