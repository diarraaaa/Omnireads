"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, UserPlus, UserCheck, UserX, Search, Loader2, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  friendship_status?: 'none' | 'sent' | 'received' | 'accepted';
  friendship_id?: string;
}

interface Friendship {
  id: string;
  initiator: Profile;
  receiver: Profile;
  status: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'recommendations'>('friends');
  
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const user = await api.getUser();
        if (user) setCurrentUserId(user.id);

        const [friendsData, requestsData, suggestedData, recsData] = await Promise.all([
          api.get("/api/friends/"),
          api.get("/api/friends/inbox/"),
          api.get("/api/users/discovery/"),
          api.get("/api/recommendations/inbox/")
        ]);
        setFriends(friendsData);
        setRequests(requestsData);
        setSuggestedUsers(suggestedData);
        setRecommendations(recsData);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const data = await api.get(`/api/users/search/?q=${searchQuery}`);
      setSearchResults(data);
    } catch (err) {
      addToast({ title: "Search Failed", description: "Could not find anyone.", type: "error" });
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (profileId: string) => {
    if (sendingIds.has(profileId)) return;
    
    const isFriend = friends.some(f => f.initiator.id === profileId || f.receiver.id === profileId);
    if (isFriend) {
      addToast({ title: "Already Connected", description: "This person is already your friend.", type: "info" });
      return;
    }

    setSendingIds(prev => new Set(prev).add(profileId));
    try {
      await api.post("/api/friends/request/", { receiver_id: profileId });
      addToast({ title: "Request Sent", description: "Friend request sent.", type: "success" });
      
      setSearchResults(prev => prev.map(u => u.id === profileId ? { ...u, friendship_status: 'sent' } : u));
      setSuggestedUsers(prev => prev.map(u => u.id === profileId ? { ...u, friendship_status: 'sent' } : u));
    } catch (err: any) {
      addToast({ title: "Request Failed", description: err.message, type: "error" });
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await api.post(`/api/friends/${requestId}/accept/`, {});
      addToast({ title: "Request Accepted", description: "You are now friends.", type: "success" });
      
      setSearchResults(prev => prev.map(u => u.friendship_id === requestId ? { ...u, friendship_status: 'accepted' } : u));
      setSuggestedUsers(prev => prev.map(u => u.friendship_id === requestId ? { ...u, friendship_status: 'accepted' } : u));

      const [friendsData, requestsData] = await Promise.all([
        api.get("/api/friends/"),
        api.get("/api/friends/inbox/")
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (err) {
      addToast({ title: "Error", description: "Failed to accept invitation.", type: "error" });
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await api.post(`/api/friends/${requestId}/reject/`, {});
      addToast({ title: "Request Declined", description: "Friend request declined.", type: "info" });
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      addToast({ title: "Error", description: "Failed to decline invitation.", type: "error" });
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    try {
      await api.post(`/api/friends/${friendshipId}/reject/`, {});
      setFriends(prev => prev.filter(f => f.id !== friendshipId));
      addToast({ title: "Friend Removed", description: "User removed from friends.", type: "info" });
    } catch (err) {
      addToast({ title: "Error", description: "Failed to remove friend.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-8 h-8 text-accent-gold" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-4xl font-serif font-bold text-foreground">
          Friends
        </h1>
        <p className="text-foreground/40 italic font-serif">Connect with friends and see what they're reading.</p>
      </header>

      <div className="flex items-center gap-8 border-b border-foreground/5 pb-1">
        <button 
          onClick={() => setActiveTab('friends')}
          className={`pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'friends' ? 'text-accent-gold' : 'text-foreground/40 hover:text-foreground/60'}`}
        >
          My Friends
          {activeTab === 'friends' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold" />}
        </button>
        <button 
          onClick={() => setActiveTab('recommendations')}
          className={`pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'recommendations' ? 'text-accent-gold' : 'text-foreground/40 hover:text-foreground/60'}`}
        >
          Book Recommendations
          {activeTab === 'recommendations' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold" />}
          {recommendations.length > 0 && <span className="ml-2 bg-accent-gold text-white text-[8px] px-1.5 py-0.5 rounded-full">{recommendations.length}</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section: Friend List */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card-bg rounded-2xl p-8 border border-foreground/5 shadow-sm">
            {activeTab === 'friends' ? (
              <>
                <h2 className="text-xl font-serif font-bold mb-8 flex items-center gap-3 text-foreground border-b border-foreground/5 pb-4">
                  <User className="text-accent-gold" /> Friends List
                </h2>
                
                {friends.length === 0 ? (
                  <div className="text-center py-20 text-foreground/20">
                    <User className="w-16 h-16 mx-auto mb-6 opacity-10" />
                    <p className="font-serif italic text-lg">Your friend list is empty. Search for friends to start sharing books.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.map((f) => {
                      const profile = f.initiator.id === currentUserId ? f.receiver : f.initiator;
                      const displayName = profile.username || profile.name || "Anonymous Reader";
                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 transition-all border border-foreground/5 group"
                        >
                          <button 
                            onClick={() => router.push(`/dashboard/profile/${profile.id}`)}
                            className="w-12 h-12 rounded-full bg-accent-green flex items-center justify-center text-xl font-serif font-bold text-white shadow-lg shadow-accent-green/10 overflow-hidden"
                          >
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              displayName.charAt(0).toUpperCase()
                            )}
                          </button>
                          <button 
                            onClick={() => router.push(`/dashboard/profile/${profile.id}`)}
                            className="flex-1 text-left"
                          >
                            <h3 className="font-serif font-bold text-foreground line-clamp-1">{displayName}</h3>
                            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Friend</p>
                          </button>
                          <button 
                            onClick={() => removeFriend(f.id)}
                            className="p-2 rounded-xl bg-foreground/5 hover:bg-red-500/10 text-foreground/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-serif font-bold mb-8 flex items-center gap-3 text-foreground border-b border-foreground/5 pb-4">
                  <BookOpen className="text-accent-gold w-5 h-5" /> Book Recommendations
                </h2>
                {recommendations.length === 0 ? (
                  <div className="text-center py-20 text-foreground/20">
                    <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-10" />
                    <p className="font-serif italic text-lg">You haven't received any recommendations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 rounded-[2rem] bg-foreground/5 border border-foreground/5 flex flex-col md:flex-row gap-6 hover:border-accent-gold/20 transition-all group"
                      >
                        <div className="w-24 h-36 rounded-xl overflow-hidden shadow-xl shrink-0">
                          {rec.book.cover_url ? (
                            <img src={rec.book.cover_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-card-bg flex items-center justify-center text-foreground/10 italic text-[10px] p-2 text-center">No Cover</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">Recommendation from {rec.from_user_username}</span>
                              <span className="text-[10px] text-foreground/20 font-serif italic">• {new Date(rec.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-foreground group-hover:text-accent-gold transition-colors">{rec.book.title}</h3>
                            <p className="text-foreground/40 italic font-serif">by {rec.book.author}</p>
                          </div>
                          {rec.message && (
                            <div className="p-4 rounded-2xl bg-background/50 border border-foreground/5 font-serif italic text-foreground/60 text-sm relative">
                              <span className="absolute -top-3 left-4 px-2 bg-card-bg text-[8px] font-bold text-foreground/20 uppercase tracking-[0.2em]">Note</span>
                              "{rec.message}"
                            </div>
                          )}
                          <div className="flex gap-4">
                            <Link href={`/dashboard/books/${rec.book.id}`} className="px-6 py-2 rounded-xl bg-accent-gold text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all">
                              View Book
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Sidebar: Stats, Requests & Search */}
        <div className="space-y-8">
          <section className="bg-foreground/5 rounded-2xl p-6 border border-foreground/5 shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-serif font-bold text-accent-gold">{friends.length}</p>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Friends</p>
              </div>
              <div className="border-l border-foreground/5">
                <p className="text-2xl font-serif font-bold text-accent-gold">{requests.length}</p>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Requests</p>
              </div>
            </div>
          </section>

          {requests.length > 0 && (
            <section className="bg-accent-gold/5 rounded-2xl p-6 border border-accent-gold/20">
              <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2 text-foreground">
                <UserPlus className="text-accent-gold w-5 h-5" /> Friend Requests
              </h2>
              <div className="space-y-4">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-accent-gold/10">
                    <button 
                      onClick={() => router.push(`/dashboard/profile/${r.initiator.id}`)}
                      className="flex items-center gap-3 group overflow-hidden flex-1"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold text-xs font-serif font-bold overflow-hidden shadow-inner border border-accent-gold/20 flex-shrink-0">
                        {r.initiator.avatar_url ? (
                          <img src={r.initiator.avatar_url} alt={r.initiator.username} className="w-full h-full object-cover" />
                        ) : (
                          (r.initiator.username || "S").charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="font-serif font-bold text-foreground text-sm group-hover:text-accent-gold transition-colors truncate">
                        {r.initiator.username || r.initiator.name || "Unknown User"}
                      </span>
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => acceptRequest(r.id)}
                        className="p-2 rounded-xl bg-accent-green text-white hover:bg-accent-green/90 transition-all shadow-md shadow-accent-green/10"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => rejectRequest(r.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-card-bg rounded-2xl p-6 border border-foreground/5 shadow-sm">
            <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2 text-foreground">
              <Search className="text-accent-gold w-5 h-5" /> Find Friends
            </h2>
            <form onSubmit={handleSearch} className="relative mb-6">
              <input
                type="text"
                placeholder="Search for people..."
                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:border-accent-gold transition-all text-sm font-serif italic"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-3 p-1 text-foreground/40 hover:text-accent-gold transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>

            <AnimatePresence mode="wait">
              {searching ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-accent-gold animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {searchResults.map((res) => {
                    const displayName = res.username || res.name || "Reader";
                    const isSent = sendingIds.has(res.id);
                    const isFriend = friends.some(f => f.initiator.id === res.id || f.receiver.id === res.id);
                    
                    return (
                      <div key={res.id} className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-all border border-foreground/5 group">
                        <button 
                          onClick={() => router.push(`/dashboard/profile/${res.id}`)}
                          className="flex items-center gap-3 flex-1 text-left overflow-hidden"
                        >
                          <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold text-sm font-serif font-bold overflow-hidden flex-shrink-0">
                            {res.avatar_url ? (
                               <img src={res.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                               displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm font-serif font-bold text-foreground group-hover:text-accent-gold transition-colors truncate">{displayName}</span>
                        </button>
                        <div className="flex gap-2">
                          {isFriend || res.friendship_status === 'accepted' ? (
                            <span className="text-[10px] font-bold text-accent-green uppercase tracking-tighter self-center">Friend</span>
                          ) : res.friendship_status === 'sent' || isSent ? (
                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter self-center">Pending</span>
                          ) : res.friendship_status === 'received' ? (
                            <button 
                              onClick={() => res.friendship_id && acceptRequest(res.friendship_id)}
                              className="p-2 rounded-xl bg-accent-green text-white hover:bg-accent-green/90 transition-all shadow-md"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => sendRequest(res.id)}
                              className="p-2 rounded-xl bg-card-bg hover:bg-accent-gold hover:text-white text-foreground/40 group-hover:border-accent-gold/20 border-transparent transition-all shadow-sm border"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : searchQuery && !searching ? (
                <p className="text-center text-sm text-gray-500 py-4 font-serif italic">No people found.</p>
              ) : suggestedUsers.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest px-1">Suggested Friends</p>
                  <div className="space-y-2">
                    {suggestedUsers.map((user) => {
                      const displayName = user.username || user.name || "Reader";
                      const isSent = sendingIds.has(user.id);
                      const isFriend = friends.some(f => f.initiator.id === user.id || f.receiver.id === user.id);
                      
                      return (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-all border border-transparent hover:border-foreground/5 group">
                          <button 
                            onClick={() => router.push(`/dashboard/profile/${user.id}`)}
                            className="flex items-center gap-3 flex-1 text-left overflow-hidden"
                          >
                            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/40 text-xs font-serif font-bold overflow-hidden shadow-inner flex-shrink-0">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                              ) : (
                                displayName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-serif text-foreground/70 group-hover:text-foreground transition-colors truncate">{displayName}</span>
                          </button>
                          {isFriend ? (
                            <span className="text-[10px] font-bold text-accent-green uppercase tracking-tighter">Friend</span>
                          ) : (
                            <button 
                              onClick={() => sendRequest(user.id)}
                              disabled={isSent}
                              className={`p-1.5 rounded-lg transition-all ${isSent ? 'text-accent-green' : 'text-foreground/20 hover:text-accent-gold hover:bg-accent-gold/10'}`}
                            >
                              {isSent ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}
