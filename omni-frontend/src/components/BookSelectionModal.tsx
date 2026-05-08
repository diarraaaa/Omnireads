"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Plus,
  Book,
  CheckCircle2,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface BookType {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
}

interface LibraryItem {
  id: string;
  book: BookType;
  status: string;
}

interface BookSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (book: BookType) => void;
}

export default function BookSelectionModal({ isOpen, onClose, onSelect }: BookSelectionModalProps) {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchLibrary = async () => {
        try {
          const data = await api.get("/api/library/");
          setLibrary(Array.isArray(data) ? data : []);
        } catch (err) {
          addToast({ title: "Error", description: "Failed to fetch library.", type: "error" });
        } finally {
          setLoading(false);
        }
      };
      fetchLibrary();
    }
  }, [isOpen]);

  const handleSelect = () => {
    const selected = library.find(item => item.book.id === selectedBookId);
    if (selected) {
      onSelect(selected.book);
      onClose();
    }
  };

  const filteredLibrary = library.filter(item => 
    item.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <h2 className="text-2xl font-serif font-bold text-foreground">Select a Book</h2>
                  <p className="text-xs text-foreground/40 italic font-serif">Recommend something from your library</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full">
                  <X className="w-5 h-5 text-foreground/40" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <input 
                    type="text" 
                    placeholder="Search your library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic"
                  />
                </div>

                {/* Book List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent-gold" /></div>
                  ) : filteredLibrary.length === 0 ? (
                    <p className="text-center py-8 text-xs text-foreground/30 font-serif italic">Your library is empty or no books match.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredLibrary.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedBookId(item.book.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedBookId === item.book.id 
                              ? "bg-accent-gold/10 border-accent-gold text-accent-gold shadow-sm" 
                              : "bg-foreground/5 border-transparent hover:border-foreground/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 rounded-lg bg-foreground/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {item.book.cover_url ? (
                                <img src={item.book.cover_url} className="w-full h-full object-cover" />
                              ) : (
                                <Book className="w-4 h-4 text-foreground/20" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-serif font-bold truncate">{item.book.title}</span>
                              <span className="text-[10px] text-foreground/40 font-serif italic truncate">{item.book.author}</span>
                            </div>
                          </div>
                          {selectedBookId === item.book.id && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSelect}
                  disabled={!selectedBookId}
                  className="w-full bg-accent-gold text-white font-serif font-bold py-4 rounded-xl shadow-lg shadow-accent-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
