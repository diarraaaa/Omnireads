"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Book as BookIcon, 
  Loader2, 
  ChevronLeft, 
  UserPlus, 
  UserCheck, 
  MessageSquare,
  Library,
  Calendar,
  MapPin,
  Link as LinkIcon
} from "lucide-react";
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
  created_at: string;
  friend_count: number;
  book_count: number;
  friendship_status?: 'none' | 'sent' | 'received' | 'accepted';
  is_self?: boolean;
}

interface LibraryItem {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
  };
  status: string;
  created_at?: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileData, libraryData] = await Promise.all([
          api.get(`/api/profile/${id}/`),
          api.get(`/api/library/?user_id=${id}`)
        ]);
        setProfile(profileData);
        setLibrary(libraryData);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        addToast({ title: "Error", description: "Failed to retrieve this user profile.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const sendRequest = async () => {
    if (!profile) return;
    setRequesting(true);
    try {
      await api.post("/api/friends/request/", { receiver_id: profile.id });
      setProfile({ ...profile, friendship_status: 'sent' });
      addToast({ title: "Request Sent", description: "Friend request sent.", type: "success" });
    } catch (err) {
      addToast({ title: "Send Failed", description: "Could not send the request.", type: "error" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-accent-gold animate-spin" />
        <p className="font-serif italic text-foreground/40">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-serif font-bold text-foreground">User Not Found</h2>
        <p className="text-foreground/40 mt-4">This person could not be found.</p>
        <button onClick={() => router.back()} className="mt-8 text-accent-gold hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition-all group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{profile.username}</h1>
          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{library.length} Books in Collection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-card-bg rounded-3xl border border-foreground/5 p-8 shadow-xl relative overflow-hidden">
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 blur-[50px] -mr-16 -mt-16" />
            
            <div className="relative z-10 text-center">
              <div className="w-32 h-32 rounded-full border-4 border-accent-gold/20 bg-accent-gold/5 mx-auto flex items-center justify-center text-4xl font-serif font-bold text-accent-gold overflow-hidden shadow-2xl mb-6">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  (profile.username || "S").charAt(0).toUpperCase()
                )}
              </div>

              <h2 className="text-2xl font-serif font-bold text-foreground mb-1">{profile.username}</h2>
              <p className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.3em] mb-6">Reader</p>
              
              <div className="py-6 border-y border-foreground/5 mb-8">
                <p className="text-sm text-foreground/60 italic font-serif leading-relaxed">
                  {profile.bio || "This user hasn't written a bio yet."}
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 text-foreground/40 text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {profile.is_self ? (
                  <button 
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full py-4 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-foreground transition-all font-serif font-bold text-sm border border-foreground/5 shadow-inner"
                  >
                    Edit Profile
                  </button>
                ) : profile.friendship_status === 'accepted' ? (
                  <div className="flex gap-2">
                    <div className="flex-1 py-3.5 rounded-2xl bg-accent-green/10 text-accent-green font-serif font-bold text-sm border border-accent-green/20 flex items-center justify-center gap-2">
                      <UserCheck className="w-4 h-4" /> Friend
                    </div>
                    <Link 
                      href={`/dashboard/messages?user_id=${profile.id}`}
                      className="p-3.5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-accent-gold transition-all border border-foreground/5 shadow-inner flex items-center justify-center"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </Link>
                  </div>
                ) : profile.friendship_status === 'received' ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push('/dashboard/friends')}
                      className="flex-1 bg-accent-gold text-white font-serif font-bold py-4 rounded-2xl shadow-lg shadow-accent-gold/20 hover:bg-accent-gold/90 transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Accept Request
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={sendRequest}
                    disabled={requesting || profile.friendship_status === 'sent'}
                    className="w-full bg-accent-gold text-white font-serif font-bold py-4 rounded-2xl shadow-lg shadow-accent-gold/20 hover:bg-accent-gold/90 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {profile.friendship_status === 'sent' ? (
                      <> <Loader2 className="w-4 h-4 animate-spin" /> Request Sent </>
                    ) : (
                      <> <UserPlus className="w-4 h-4" /> Add Friend </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Social Stats */}
          <section className="bg-foreground/[0.02] border border-foreground/5 rounded-3xl p-6 grid grid-cols-2 gap-4">
            <div className="text-center p-4">
              <p className="text-2xl font-serif font-bold text-foreground">{profile.book_count}</p>
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Books</p>
            </div>
            <div className="text-center p-4 border-l border-foreground/5">
              <p className="text-2xl font-serif font-bold text-foreground">{profile.friend_count}</p>
              <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Friends</p>
            </div>
          </section>
        </div>

        {/* Right Column: Library Feed */}
        <div className="lg:col-span-2">
          <section className="bg-card-bg rounded-3xl border border-foreground/5 p-8 shadow-xl min-h-[600px]">
            <div className="flex items-center justify-between mb-10 border-b border-foreground/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-gold/10 rounded-xl">
                  <Library className="text-accent-gold w-5 h-5" />
                </div>
                <h3 className="text-xl font-serif font-bold text-foreground">Reading Collection</h3>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-[10px] font-bold uppercase tracking-widest text-accent-gold border border-accent-gold/20">All Works</button>
                <button className="px-4 py-2 rounded-lg bg-foreground/5 text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:text-foreground">Finished</button>
              </div>
            </div>

            {library.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-foreground/10">
                <BookIcon className="w-20 h-20 mb-6 opacity-5" />
                <p className="font-serif italic text-lg text-foreground/20 text-center max-w-sm">
                  This collection is currently empty.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {library.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-foreground/5 p-4 rounded-2xl border border-foreground/5 flex gap-4 hover:border-accent-gold/30 hover:bg-foreground/10 transition-all shadow-sm"
                  >
                    <div className="w-20 h-28 bg-foreground/10 rounded-lg overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-accent-gold/10 transition-all relative">
                      <div className="absolute inset-y-0 left-0 w-2 bg-black/20 z-10" />
                      {item.book.cover_url ? (
                        <img src={item.book.cover_url} alt={item.book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookIcon className="w-8 h-8 text-foreground/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-foreground line-clamp-1 group-hover:text-accent-gold transition-colors">{item.book.title}</h4>
                        <p className="text-xs text-foreground/40 italic font-serif truncate mt-0.5">by {item.book.author}</p>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-1 rounded-md ${
                          item.status === 'reading' ? 'bg-accent-gold/10 text-accent-gold border border-accent-gold/10' :
                          item.status === 'completed' ? 'bg-accent-green/10 text-accent-green border border-accent-green/10' :
                          'bg-foreground/10 text-foreground/40'
                        }`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        
                        <Link 
                          href={`/dashboard/books/${item.book.id}`}
                          className="p-1.5 rounded-lg bg-foreground/5 text-foreground/20 hover:text-accent-gold transition-all"
                        >
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
