"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  Loader2, 
  Send,
  Plus,
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
}

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
}

export default function RecommendationModal({ isOpen, onClose, bookId, bookTitle }: RecommendationModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchFriends = async () => {
        try {
          // Get current user first to identify friends in friendships
          const currentUser = await api.get("/api/profile/");
          const friendshipData = await api.get("/api/friends/");
          
          if (Array.isArray(friendshipData)) {
            const friendProfiles = friendshipData.map((f: any) => 
              f.initiator.id === currentUser.id ? f.receiver : f.initiator
            );
            setFriends(friendProfiles);
          } else {
            setFriends([]);
          }
        } catch (err) {
          addToast({ title: "Error", description: "Failed to fetch friends.", type: "error" });
        } finally {
          setLoading(false);
        }
      };
      fetchFriends();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!selectedFriend) return;
    setSending(true);
    try {
      await api.post("/api/recommendations/send/", {
        to_user_id: selectedFriend,
        book_id: bookId,
        message: comment
      });

      addToast({ 
        title: "Recommendation Sent", 
        description: `You have shared "${bookTitle}" with your friend.`, 
        type: "success" 
      });
      onClose();
      setSelectedFriend(null);
      setComment("");
    } catch (err) {
      addToast({ title: "Failed to Send", description: "Could not deliver the recommendation.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const filteredFriends = Array.isArray(friends) ? friends.filter(f => 
    f?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

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
                  <h2 className="text-2xl font-serif font-bold text-foreground">Recommend Book</h2>
                  <p className="text-xs text-foreground/40 italic font-serif">Sharing "{bookTitle}"</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full">
                  <Plus className="w-5 h-5 rotate-45 text-foreground/40" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <input 
                    type="text" 
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic"
                  />
                </div>

                {/* Friend List */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent-gold" /></div>
                  ) : filteredFriends.length === 0 ? (
                    <p className="text-center py-8 text-xs text-foreground/30 font-serif italic">No friends found.</p>
                  ) : (
                    filteredFriends.map(friend => (
                      <div 
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedFriend === friend.id 
                            ? "bg-accent-gold/10 border-accent-gold text-accent-gold shadow-sm" 
                            : "bg-foreground/5 border-transparent hover:border-foreground/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-foreground/10 overflow-hidden flex items-center justify-center">
                            {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-foreground/20" />}
                          </div>
                          <span className="text-sm font-serif font-bold">{friend.username}</span>
                        </div>
                        {selectedFriend === friend.id && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    ))
                  )}
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Personal Message
                  </label>
                  <textarea 
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Why should your friend read this book?"
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl p-4 text-sm focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic"
                  />
                </div>

                <button 
                  onClick={handleSend}
                  disabled={!selectedFriend || sending}
                  className="w-full bg-accent-gold text-white font-serif font-bold py-4 rounded-xl shadow-lg shadow-accent-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending..." : "Send Recommendation"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
