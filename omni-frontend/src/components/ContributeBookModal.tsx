"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Plus,
  BookOpen,
  CheckCircle2,
  Library
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Book {
  id: string;
  title: string;
  author: string;
  thumbnail?: string;
}

interface ContributeBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
}

export default function ContributeBookModal({ isOpen, onClose, groupId, onSuccess }: ContributeBookModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { addToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const data = await api.get(`/api/books/?q=${searchQuery}`);
      setSearchResults(data.results || []);
    } catch (err) {
      addToast({ title: "Search Failed", description: "Could not retrieve books from the library.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedBook) return;
    setAdding(true);
    try {
      await api.post(`/api/groups/${groupId}/books/`, {
        book_id: selectedBook,
        status: "reading"
      });
      addToast({ 
        title: "Book Added", 
        description: "The book has been added to the group library.", 
        type: "success" 
      });
      onSuccess();
      onClose();
      setSelectedBook(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      addToast({ title: "Addition Failed", description: "Could not add the book to the group.", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-card-bg border border-foreground/10 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground">Add Book</h2>
                  <p className="text-xs text-foreground/40 italic font-serif">Add a book to the group library.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full">
                  <Plus className="w-5 h-5 rotate-45 text-foreground/40" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <input 
                    type="text" 
                    placeholder="Search for a book..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic"
                  />
                  <button type="submit" className="hidden">Search</button>
                </form>

                {/* Book List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[100px]">
                  {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent-gold" /></div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-20">
                      <Library className="w-12 h-12 mb-2" />
                      <p className="text-xs font-serif italic text-center">Search for a book to add.</p>
                    </div>
                  ) : (
                    searchResults.map(book => (
                      <div 
                        key={book.id}
                        onClick={() => setSelectedBook(book.id)}
                        className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedBook === book.id 
                            ? "bg-accent-gold/10 border-accent-gold shadow-sm" 
                            : "bg-foreground/5 border-transparent hover:border-foreground/10"
                        }`}
                      >
                        <div className="w-12 h-16 rounded bg-foreground/10 overflow-hidden flex-shrink-0 shadow-sm">
                          {book.thumbnail ? (
                            <img src={book.thumbnail} className="w-full h-full object-cover" alt={book.title} />
                          ) : (
                            <BookOpen className="w-full h-full p-3 text-foreground/10" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-serif font-bold truncate ${selectedBook === book.id ? 'text-accent-gold' : 'text-foreground'}`}>{book.title}</h4>
                          <p className="text-[10px] text-foreground/40 italic font-serif truncate">by {book.author}</p>
                        </div>
                        {selectedBook === book.id && <CheckCircle2 className="w-4 h-4 text-accent-gold" />}
                      </div>
                    ))
                  )}
                </div>

                <button 
                  onClick={handleAdd}
                  disabled={!selectedBook || adding}
                  className="w-full bg-accent-gold text-white font-serif font-bold py-4 rounded-xl shadow-lg shadow-accent-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {adding ? "Adding..." : "Add to Group Library"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
