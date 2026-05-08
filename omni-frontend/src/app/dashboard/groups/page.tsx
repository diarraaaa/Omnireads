"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Plus, 
  Search, 
  Globe, 
  Lock, 
  ArrowRight, 
  Loader2, 
  Users2,
  BookOpen,
  Settings,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReadingGroup {
  id: string;
  name: string;
  description: string;
  creator: {
    username: string;
    avatar_url?: string;
  };
  is_public: boolean;
  avatar_url?: string;
  member_count: number;
  is_member: boolean;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<ReadingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: "", description: "", is_public: true });
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();
  const router = useRouter();

  const fetchGroups = async () => {
    try {
      const data = await api.get("/api/groups/");
      setGroups(data);
    } catch (err) {
      console.error("Error fetching groups:", err);
      addToast({ title: "Fetch Error", description: "Failed to retrieve the groups.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleJoinGroup = async (groupId: string, name: string) => {
    try {
      await api.post(`/api/groups/${groupId}/join/`, {});
      addToast({ title: "Welcome", description: `You have joined "${name}".`, type: "success" });
      router.push(`/dashboard/groups/${groupId}`);
    } catch (err) {
      addToast({ title: "Join Failed", description: "Could not join this group.", type: "error" });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupData.name) return;
    
    setCreating(true);
    try {
      const group = await api.post("/api/groups/", newGroupData);
      addToast({ title: "Group Created", description: `"${group.name}" has been added to your groups.`, type: "success" });
      setCreateModalOpen(false);
      setNewGroupData({ name: "", description: "", is_public: true });
      fetchGroups();
      router.push(`/dashboard/groups/${group.id}`);
    } catch (err) {
      addToast({ title: "Creation Failed", description: "Could not create the new group.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const myGroups = groups.filter(g => g.is_member);
  const discoverGroups = groups.filter(g => !g.is_member && g.is_public);
  const filteredDiscover = discoverGroups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground">Reading Groups</h1>
          <p className="text-foreground/40 italic font-serif mt-2">Chat with friends about the books you love.</p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 bg-accent-gold text-white px-6 py-3 rounded-2xl font-serif font-bold shadow-lg shadow-accent-gold/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" /> Create New Group
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-12">
          {/* My Groups */}
          <section>
            <h2 className="text-xl font-serif font-bold text-foreground mb-6 flex items-center gap-3">
              <ShieldCheck className="text-accent-gold" /> Your Groups
            </h2>
            {myGroups.length === 0 ? (
              <div className="bg-foreground/5 border border-dashed border-foreground/10 rounded-3xl p-12 text-center">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-foreground/40 font-serif italic">You haven't joined any reading groups yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myGroups.map((group) => (
                  <Link href={`/dashboard/groups/${group.id}`} key={group.id}>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="group bg-card-bg border border-foreground/5 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-accent-gold/20 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen className="w-16 h-16" />
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent-gold/10 flex items-center justify-center text-accent-gold text-xl font-serif font-bold overflow-hidden shadow-inner">
                          {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : group.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-foreground group-hover:text-accent-gold transition-colors">{group.name}</h3>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                            {group.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {group.is_public ? "Public" : "Private"} • {group.member_count} Members
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/60 line-clamp-2 italic font-serif mb-4">{group.description || "A place to talk about books."}</p>
                      <div className="flex items-center text-accent-gold text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                        Open Group <ArrowRight className="w-3 h-3" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Discovery */}
          <section>
            <h2 className="text-xl font-serif font-bold text-foreground mb-6 flex items-center gap-3">
              <Search className="text-accent-gold" /> Find Groups
            </h2>
            <div className="relative mb-8">
              <input 
                type="text" 
                placeholder="Search for groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 pl-12 text-foreground focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
            </div>

            <div className="space-y-4">
              {filteredDiscover.map((group) => (
                <div 
                  key={group.id}
                  onClick={() => router.push(`/dashboard/groups/${group.id}`)}
                  className="flex items-center justify-between p-4 bg-foreground/5 hover:bg-foreground/10 rounded-2xl border border-transparent hover:border-foreground/5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-gold/10 flex items-center justify-center text-accent-gold text-sm font-serif font-bold shadow-inner">
                      {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : group.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-foreground group-hover:text-accent-gold transition-colors">{group.name}</h4>
                      <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{group.member_count} Members • Created by {group.creator.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGroup(group.id, group.name);
                    }}
                    className="px-6 py-2 rounded-xl bg-background border border-foreground/10 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hover:bg-accent-gold hover:text-white hover:border-accent-gold transition-all shadow-sm"
                  >
                    Join Group
                  </button>
                </div>
              ))}
              {filteredDiscover.length === 0 && searchQuery && (
                <p className="text-center py-12 text-foreground/30 font-serif italic">No groups found with that name.</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="bg-accent-gold/5 border border-accent-gold/20 rounded-3xl p-8 text-center">
            <Users className="w-12 h-12 text-accent-gold mx-auto mb-4" />
            <h3 className="font-serif font-bold text-lg text-foreground mb-2">Group Reading</h3>
            <p className="text-sm text-foreground/60 italic font-serif mb-6 leading-relaxed">"Reading together is always more fun."</p>
            <div className="text-left space-y-4">
              <div className="flex items-center gap-3 text-xs font-serif text-foreground/40">
                <Globe className="w-4 h-4 text-accent-gold" /> <span>Public groups are open to everyone.</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-serif text-foreground/40">
                <Lock className="w-4 h-4 text-accent-gold" /> <span>Private groups require an invite.</span>
              </div>
            </div>
          </section>

          <section className="bg-card-bg border border-foreground/5 rounded-3xl p-6">
            <h3 className="text-xs font-bold text-foreground/30 uppercase tracking-widest mb-4">Trending Conversations</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                  <p className="text-xs font-serif text-foreground/60 group-hover:text-foreground transition-colors truncate">Discussions on "The Shadow of the Wind"</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-card-bg border border-foreground/10 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              {/* Gold decorative light */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold/5 blur-[60px] -mr-24 -mt-24" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-serif font-bold text-foreground">Create a Group</h2>
                  <button onClick={() => setCreateModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                    <Plus className="w-6 h-6 rotate-45 text-foreground/40" />
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest ml-1">Group Name</label>
                    <input 
                      type="text" 
                      required
                      value={newGroupData.name}
                      onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                      className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-accent-gold/40 transition-all font-serif"
                      placeholder="e.g., The Midnight Readers"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      rows={3}
                      value={newGroupData.description}
                      onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                      className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-accent-gold/40 transition-all font-serif italic"
                      placeholder="What is this group about?"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border border-foreground/10">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${newGroupData.is_public ? 'bg-accent-gold/20 text-accent-gold' : 'bg-foreground/10 text-foreground/40'}`}>
                        {newGroupData.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-serif font-bold text-foreground">{newGroupData.is_public ? "Public Group" : "Private Group"}</p>
                        <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-tighter">
                          {newGroupData.is_public ? "Anyone can join this group" : "Only people with an invite can join"}
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNewGroupData({...newGroupData, is_public: !newGroupData.is_public})}
                      className="text-[10px] font-bold text-accent-gold underline uppercase tracking-widest hover:text-accent-gold/60 transition-colors"
                    >
                      Toggle
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={creating}
                    className="w-full bg-accent-gold text-white font-serif font-bold py-5 rounded-2xl shadow-xl shadow-accent-gold/20 hover:bg-accent-gold/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                    {creating ? "Creating..." : "Create Group"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
