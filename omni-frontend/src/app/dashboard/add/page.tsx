"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Search, Book as BookIcon, Save, X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddBookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    cover_url: "",
    description: "",
    genre: ""
  });

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5`);
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectBook = (item: any) => {
    const info = item.volumeInfo;
    setFormData({
      title: info.title || "",
      author: info.authors?.[0] || "",
      isbn: info.industryIdentifiers?.[0]?.identifier || "",
      cover_url: info.imageLinks?.thumbnail?.replace("http:", "https:") || "",
      description: info.description || "",
      genre: info.categories?.[0] || ""
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/books/", formData);
      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message || "Failed to add book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <section className="text-center border-b-2 border-accent-gold/20 pb-8 relative">
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-2 bg-accent-gold/40 rounded-full"></div>
        <h2 className="text-5xl font-serif font-bold tracking-tight text-foreground mb-3">Acquire New Volume</h2>
        <p className="text-foreground/50 italic font-serif text-lg">Unearth a record from the global repository or manually document a new manuscript.</p>
      </section>

      {/* Magic Search */}
      <div className="relative">
        <div className="flex items-center gap-4 p-2 bg-card-bg border border-foreground/5 rounded-2xl focus-within:border-accent-gold/50 transition-all shadow-sm">
          <div className="pl-4">
            <Sparkles className="w-5 h-5 text-accent-gold" />
          </div>
          <input 
            type="text" 
            placeholder="Search by title, author, or ISBN (e.g. 'Project Hail Mary')..." 
            className="flex-1 bg-transparent border-none outline-none py-4 text-foreground placeholder:text-foreground/20 font-serif italic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={searching}
            className="px-8 py-3 bg-accent-gold hover:bg-accent-gold/90 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Archive Magic"}
          </button>
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-4 bg-card-bg border-2 border-accent-gold/20 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm"
            >
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectBook(item)}
                  className="w-full flex items-center gap-6 p-5 hover:bg-accent-gold/5 transition-colors border-b border-foreground/5 last:border-none text-left"
                >
                  <img 
                    src={item.volumeInfo.imageLinks?.thumbnail || "https://via.placeholder.com/150"} 
                    alt="" 
                    className="w-12 h-16 object-cover rounded-lg shadow-md"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-foreground line-clamp-1">{item.volumeInfo.title}</h4>
                    <p className="text-xs text-foreground/40 italic">by {item.volumeInfo.authors?.join(", ")}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10 bg-card-bg/30 p-8 rounded-[2rem] border-2 border-accent-gold/10 relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 rounded-bl-[100%] pointer-events-none"></div>
        
        {/* Cover Preview */}
        <div className="lg:col-span-1 space-y-4">
          <div className="aspect-[2/3] rounded-2xl bg-card-bg border-4 border-accent-gold/20 overflow-hidden flex items-center justify-center relative group shadow-2xl ring-8 ring-accent-gold/5">
            {formData.cover_url ? (
              <img src={formData.cover_url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <BookIcon className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                <p className="text-[10px] text-foreground/20 font-black uppercase tracking-[0.2em]">Volume Cover</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8 text-center">
               <p className="text-xs text-accent-gold italic font-serif">Image will be automatically unarchived if you use the Archive Magic!</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Cover Illustration URL</label>
            <input 
              type="text" 
              placeholder="https://..." 
              className="w-full bg-card-bg border border-foreground/5 rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-accent-gold/50 outline-none font-serif italic"
              value={formData.cover_url}
              onChange={(e) => setFormData({...formData, cover_url: e.target.value})}
            />
          </div>
        </div>

        {/* Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Volume Title</label>
              <input 
                required
                type="text" 
                placeholder="The Great Gatsby" 
                className="w-full bg-card-bg border border-foreground/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-accent-gold/50 outline-none font-serif font-bold"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Author Name</label>
              <input 
                required
                type="text" 
                placeholder="F. Scott Fitzgerald" 
                className="w-full bg-card-bg border border-foreground/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-accent-gold/50 outline-none font-serif italic"
                value={formData.author}
                onChange={(e) => setFormData({...formData, author: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Catalogue ID (ISBN)</label>
              <input 
                type="text" 
                placeholder="9780123456789" 
                className="w-full bg-card-bg border border-foreground/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-accent-gold/50 outline-none font-serif"
                value={formData.isbn}
                onChange={(e) => setFormData({...formData, isbn: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Genre / Classification</label>
              <input 
                type="text" 
                placeholder="Fiction, Sci-Fi, etc." 
                className="w-full bg-card-bg border border-foreground/5 rounded-xl py-3 px-4 focus:ring-1 focus:ring-accent-gold/50 outline-none font-serif"
                value={formData.genre}
                onChange={(e) => setFormData({...formData, genre: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1 font-serif">Archive Manifest (Description)</label>
            <textarea 
              rows={6}
              placeholder="Provide a detailed summary of this manuscript..." 
              className="w-full bg-card-bg border border-foreground/5 rounded-2xl py-4 px-5 focus:ring-1 focus:ring-accent-gold/50 outline-none resize-none font-serif italic text-foreground/80"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-6">
          <div className="flex items-center justify-end gap-6 pt-8">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-8 py-3 rounded-xl text-foreground/40 font-bold hover:text-accent-gold transition-colors uppercase tracking-widest text-[10px]"
            >
              Discard Changes
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-accent-green hover:bg-accent-green/90 text-white font-serif font-bold transition-all shadow-xl shadow-accent-green/30 active:scale-95 disabled:opacity-50 border-b-4 border-black/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-accent-gold" />}
              {loading ? "Archiving..." : "Commit to Stacks"}
            </button>
          </div>
          </div>
        </div>
      </form>
    </div>
  );
}
