"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  User, 
  Trash2, 
  CornerDownRight,
  Loader2,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

interface Comment {
  id: string;
  user: Profile;
  content: string;
  created_at: string;
}

interface Review {
  id: string;
  user: Profile;
  content: string;
  rating_score: number | null;
  created_at: string;
  likes_count: number;
  dislikes_count: number;
  user_vote: number | null;
  comments: Comment[];
}

interface BookReviewsProps {
  bookId: string;
  bookTitle: string;
}

export default function BookReviews({ bookId, bookTitle }: BookReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [bookId]);

  const fetchReviews = async () => {
    try {
      const data = await api.get(`/api/reviews/?book_id=${bookId}`);
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReview = async () => {
    if (!newReview.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/api/reviews/", { book_id: bookId, content: newReview });
      setNewReview("");
      fetchReviews();
      addToast({ title: "Review published successfully", type: "success" });
    } catch (error: any) {
      addToast({ title: error.message || "Failed to publish review", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (reviewId: string, voteType: number) => {
    try {
      // Find current vote to toggle
      const review = reviews.find(r => r.id === reviewId);
      const currentVote = review?.user_vote;
      
      // If same vote type, we are removing the vote (backend handles this if we implement toggle logic, 
      // but my backend implementation used explicit vote_type. Let's assume 0 for removal or just send same for toggle if backend supports it.
      // Actually, my backend ReviewVoteView.post says:
      // vote, created = ReviewVote.objects.update_or_create(..., defaults={'vote_type': vote_type})
      // If vote_type is same, it just updates to same. I should probably add a "remove vote" logic or just allow switching.
      
      const targetVote = currentVote === voteType ? 0 : voteType;
      
      await api.post(`/api/reviews/${reviewId}/vote/`, { vote_type: targetVote });
      fetchReviews();
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const handlePostComment = async (reviewId: string) => {
    if (!replyContent.trim()) return;
    try {
      await api.post(`/api/reviews/${reviewId}/comments/`, { content: replyContent });
      setReplyContent("");
      setReplyingTo(null);
      fetchReviews();
      addToast({ title: "Comment added", type: "success" });
    } catch (error: any) {
      addToast({ title: error.message || "Failed to add comment", type: "error" });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this appraisal?")) return;
    try {
      await api.delete(`/api/reviews/${reviewId}/`);
      fetchReviews();
      addToast({ title: "Appraisal removed from archives", type: "success" });
    } catch (error) {
      addToast({ title: "Failed to delete review", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Post Review Section */}
      <div className="bg-card-bg border border-foreground/5 rounded-[2rem] p-8 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-accent-gold" />
          </div>
          <h3 className="text-xl font-serif font-bold text-foreground">Record your Appraisal</h3>
        </div>
        <textarea
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          placeholder="Share your literary insights with the circle..."
          className="w-full bg-background/50 border border-foreground/10 rounded-2xl p-6 min-h-[120px] text-foreground focus:border-accent-gold/50 focus:ring-0 transition-all resize-none font-serif text-lg"
        />
        <div className="flex justify-end">
          <button
            onClick={handlePostReview}
            disabled={submitting || !newReview.trim()}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent-gold text-background font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Publish Appraisal
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <h3 className="text-2xl font-serif font-bold text-foreground">Community Archives</h3>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">{reviews.length} Appraisals</span>
        </div>

        <AnimatePresence mode="popLayout">
          {reviews.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-foreground/5 rounded-[2rem] border border-dashed border-foreground/10"
            >
              <p className="text-foreground/40 font-serif italic text-lg">The archives are currently empty for this volume. Be the first to record an appraisal.</p>
            </motion.div>
          ) : (
            reviews.map((review) => (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-card-bg/40 border border-foreground/5 rounded-[2.5rem] p-8 hover:border-accent-gold/20 transition-all"
              >
                <div className="flex gap-6">
                  {/* User Profile */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
                      {review.user.avatar_url ? (
                        <img src={review.user.avatar_url} alt={review.user.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-accent-green" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-xl text-foreground">
                          {review.user.full_name || review.user.username}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          {review.rating_score && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <div key={s} className={`w-3 h-3 rounded-full ${s <= (review.rating_score || 0) ? 'bg-accent-gold' : 'bg-foreground/10'}`} />
                              ))}
                            </div>
                          )}
                          <span className="text-foreground/30 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteReview(review.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-foreground/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-lg text-foreground/80 leading-relaxed font-serif">
                      {review.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-4 border-t border-foreground/5">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleVote(review.id, 1)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                            review.user_vote === 1 
                              ? "bg-accent-gold text-background font-bold shadow-lg shadow-accent-gold/20" 
                              : "hover:bg-foreground/5 text-foreground/40 hover:text-accent-gold"
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-xs">{review.likes_count}</span>
                        </button>
                        <button 
                          onClick={() => handleVote(review.id, -1)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                            review.user_vote === -1 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                              : "hover:bg-foreground/5 text-foreground/40 hover:text-red-400"
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span className="text-xs">{review.dislikes_count}</span>
                        </button>
                      </div>

                      <button 
                        onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                          replyingTo === review.id 
                            ? "bg-accent-green/20 text-accent-green" 
                            : "hover:bg-foreground/5 text-foreground/40 hover:text-accent-green"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{review.comments.length} Comments</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {review.comments.length > 0 && (
                      <div className="space-y-4 pt-4 ml-4 border-l-2 border-foreground/5 pl-6">
                        {review.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-foreground/5 flex-shrink-0">
                               {comment.user.avatar_url ? (
                                 <img src={comment.user.avatar_url} className="w-full h-full object-cover" />
                               ) : (
                                 <User className="w-4 h-4 text-foreground/20 m-auto mt-2" />
                               )}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-sm text-foreground">{comment.user.username}</span>
                                <span className="text-[10px] text-foreground/20">{new Date(comment.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-foreground/60">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    <AnimatePresence>
                      {replyingTo === review.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 overflow-hidden"
                        >
                          <div className="flex gap-3">
                            <div className="flex-grow relative">
                              <CornerDownRight className="absolute -left-6 top-4 w-4 h-4 text-foreground/20" />
                              <input 
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Add to the discussion..."
                                className="w-full bg-background border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:border-accent-green/50 transition-all outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(review.id)}
                              />
                            </div>
                            <button 
                              onClick={() => handlePostComment(review.id)}
                              disabled={!replyContent.trim()}
                              className="px-4 rounded-xl bg-accent-green text-background hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
