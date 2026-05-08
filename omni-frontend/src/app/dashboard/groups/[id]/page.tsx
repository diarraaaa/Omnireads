"use client";

import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  Lock, 
  Plus, 
  Search,
  MessageSquare,
  Bookmark,
  Share2,
  Trash2,
  UserPlus,
  Send,
  BarChart2,
  CheckCircle2,
  Info,
  ChevronDown,
  UserCheck,
  UserX,
  ShieldAlert,
  Star,
  MoreVertical
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import RecommendationModal from "@/components/RecommendationModal";
import ContributeBookModal from "@/components/ContributeBookModal";

interface Member {
  profile: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  role: string;
}

interface GroupBook {
  id: string;
  book: {
    id: string;
    title: string;
    authors: string[];
    thumbnail?: string;
  };
  status: string;
  added_by: {
    username: string;
  };
}

interface ReadingGroup {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  avatar_url?: string;
  member_count: number;
  is_member: boolean;
  role: string;
  members: Member[];
  books?: GroupBook[];
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = useState<ReadingGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [recommendBook, setRecommendBook] = useState<{id: string, title: string} | null>(null);
  const [isContributeModalOpen, setContributeModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [memberActionUser, setMemberActionUser] = useState<string | null>(null);
  
  const { addToast } = useToast();
  const { profile: currentUser } = useProfile();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Poll creation state
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const fetchData = async () => {
    try {
      const [groupData, messagesData, pollsData] = await Promise.all([
        api.get(`/api/groups/${id}/`),
        api.get(`/api/groups/${id}/messages/`).catch(() => []),
        api.get(`/api/groups/${id}/polls/`).catch(() => [])
      ]);
      setGroup(groupData);
      setMessages(messagesData);
      setPolls(pollsData);
    } catch (err) {
      console.error("Error fetching group data:", err);
      addToast({ title: "Group Error", description: "Failed to access this group.", type: "error" });
      router.push("/dashboard/groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get('/api/friends/');
      setFriends(res);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFriends();
    const interval = setInterval(() => {
      // Background polling for messages and polls
      api.get(`/api/groups/${id}/messages/`).then(setMessages).catch(console.error);
      api.get(`/api/groups/${id}/polls/`).then(setPolls).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, polls]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJoinLeave = async () => {
    if (!group) return;
    setJoining(true);
    try {
      if (group.is_member) {
        await api.delete(`/api/groups/${id}/join/`);
        addToast({ 
          title: "Farewell", 
          description: `You have left "${group.name}".`,
          type: "success" 
        });
        router.push("/dashboard/groups");
      } else {
        await api.post(`/api/groups/${id}/join/`, {});
        addToast({ 
          title: "Welcome", 
          description: `You have joined the group "${group.name}".`,
          type: "success" 
        });
        fetchData();
      }
    } catch (err: any) {
      console.error("Error joining/leaving group:", err);
      // Backend returns { error: "..." } on 400 Bad Request
      const errorMessage = err.error || "Unable to process membership change.";
      addToast({ 
        title: "Action Failed", 
        description: errorMessage, 
        type: "error" 
      });
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group?.id) return;
    if (!window.confirm(`Are you absolutely sure you want to delete "${group.name}"? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/api/groups/${id}/`);
      addToast({ title: "Group Deleted", description: "The group has been dissolved.", type: "success" });
      router.push("/dashboard/groups");
    } catch (err: any) {
      addToast({ title: "Error", description: err.error || "Failed to delete group.", type: "error" });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    if (!group) return;
    setSending(true);
    try {
      const res = await api.post(`/api/groups/${id}/messages/`, { content: newMessage });
      setMessages([...messages, res]);
      setNewMessage('');
    } catch (err) {
      addToast({ title: 'Error', description: 'Failed to send message', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await api.post(`/api/groups/${id}/polls/${pollId}/vote/`, { option_id: optionId });
      addToast({ title: 'Success', description: 'Vote recorded!', type: 'success' });
      // Quick refresh polls
      const newPolls = await api.get(`/api/groups/${id}/polls/`);
      setPolls(newPolls);
    } catch (err) {
      addToast({ title: 'Error', description: 'Failed to vote', type: 'error' });
    }
  };

  const handleCreatePoll = async () => {
    const filteredOptions = pollOptions.filter(o => o.trim() !== '');
    if (!pollQuestion.trim() || filteredOptions.length < 2) {
      addToast({ title: 'Invalid Poll', description: 'Please provide a question and at least 2 options', type: 'error' });
      return;
    }

    try {
      await api.post(`/api/groups/${id}/polls/`, {
        question: pollQuestion,
        options: filteredOptions
      });
      addToast({ title: 'Success', description: 'Poll created!', type: 'success' });
      setShowCreatePoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      // Refresh polls
      const newPolls = await api.get(`/api/groups/${id}/polls/`);
      setPolls(newPolls);
    } catch (err) {
      addToast({ title: 'Error', description: 'Failed to create poll', type: 'error' });
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      await api.post(`/api/groups/${id}/members/`, { user_id: friendId });
      addToast({ title: "Success", description: "Friend added to group!", type: "success" });
      fetchData();
    } catch (err: any) {
      addToast({ title: "Error", description: err.error || "Failed to add friend.", type: "error" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/api/groups/${id}/members/${userId}/`);
      addToast({ title: "Removed", description: "Member has been removed.", type: "success" });
      setMemberActionUser(null);
      fetchData();
    } catch (err) {
      addToast({ title: "Error", description: "Failed to remove member.", type: "error" });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (newRole === 'creator') {
      if (!window.confirm("Are you sure you want to transfer ownership? You will be demoted to Admin and the other user will become the new Creator.")) return;
    }
    
    try {
      await api.patch(`/api/groups/${id}/members/${userId}/`, { role: newRole });
      addToast({ title: "Updated", description: `Member role updated to ${newRole}.`, type: "success" });
      setMemberActionUser(null);
      fetchData();
    } catch (err: any) {
      addToast({ title: "Error", description: err.error || "Failed to update role.", type: "error" });
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast({ title: "Invite Link Copied", description: "Share this link to invite others.", type: "success" });
  };

  const addOption = () => setPollOptions([...pollOptions, '']);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  // Merge messages and polls into a single timeline
  const timeline = [
    ...messages.map(m => ({ type: 'message' as const, time: new Date(m.created_at).getTime(), data: m })),
    ...polls.map(p => ({ type: 'poll' as const, time: new Date(p.created_at).getTime(), data: p }))
  ].sort((a, b) => a.time - b.time);

  return (
    <div className="flex h-[calc(100vh-80px)] -mt-4 sm:-mx-8 overflow-hidden bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-chat-bg">
        {/* Chat Header */}
        <div className="h-16 shrink-0 bg-card-bg/95 backdrop-blur-md border-b border-foreground/5 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/groups" className="p-2 -ml-2 rounded-xl text-foreground/40 hover:text-accent-gold hover:bg-foreground/5 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center overflow-hidden border border-accent-gold/20 shrink-0">
              {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : <span className="font-serif font-bold text-accent-gold text-lg">{group.name[0]}</span>}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-serif font-bold text-foreground truncate max-w-[200px] sm:max-w-md">{group.name}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                {group.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{group.member_count} members</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!group.is_member ? (
              <button 
                onClick={handleJoinLeave}
                disabled={joining}
                className="px-4 py-1.5 bg-accent-gold text-white text-xs font-bold rounded-lg shadow-md hover:scale-105 transition-all"
              >
                {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join Group"}
              </button>
            ) : group.role !== 'creator' && (
              <button 
                onClick={handleJoinLeave}
                disabled={joining}
                className="px-4 py-1.5 bg-foreground/5 text-foreground/40 text-xs font-bold rounded-lg border border-foreground/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
              >
                {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Leave Group"}
              </button>
            )}
            {group.is_member && (
              <button 
                onClick={() => setShowCreatePoll(true)}
                className="p-2 rounded-xl text-accent-gold hover:bg-accent-gold/10 transition-all hidden sm:block"
                title="Create Poll"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className="p-2 rounded-xl text-foreground/40 hover:text-accent-gold hover:bg-foreground/5 transition-all"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-accent-gold/[0.02]">
          {/* Group Intro */}
          <div className="text-center my-10 max-w-md mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-accent-gold/10 flex items-center justify-center overflow-hidden mx-auto mb-4 border border-accent-gold/20 shadow-lg">
              {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : <span className="font-serif font-bold text-accent-gold text-4xl">{group.name[0]}</span>}
            </div>
            <h3 className="text-2xl font-serif font-bold text-foreground mb-2">Welcome to {group.name}</h3>
            <p className="text-foreground/50 text-sm font-serif italic">{group.description}</p>
          </div>

          <div className="space-y-6 pb-4 max-w-4xl mx-auto">
            {timeline.length === 0 ? (
              <p className="text-center text-foreground/30 font-serif italic text-sm mt-12">Be the first to start the conversation!</p>
            ) : (
              timeline.map((item, index) => {
                if (item.type === 'message') {
                  const msg = item.data;
                  const isSelf = msg.sender.id === currentUser?.id;
                  const prevItem = timeline[index - 1];
                  const showName = !prevItem || prevItem.type !== 'message' || prevItem.data.sender.id !== msg.sender.id || (item.time - prevItem.time > 5 * 60000);
                  
                  return (
                    <div key={`msg-${msg.id}`} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                      {showName && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-foreground/40">{isSelf ? "You" : msg.sender.username}</span>
                          <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-tighter">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isSelf 
                          ? 'bg-accent-gold text-white rounded-tr-sm shadow-accent-gold/20' 
                          : 'bg-card-bg text-foreground rounded-tl-sm border border-foreground/5'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  // Poll
                  const poll = item.data;
                  const isCreatorSelf = poll.creator.id === currentUser?.id;
                  return (
                    <div key={`poll-${poll.id}`} className="flex flex-col items-center my-8">
                      <div className="w-full max-w-md bg-card-bg border border-accent-gold/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 blur-[50px] -mr-16 -mt-16" />
                        
                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <BarChart2 className="w-4 h-4 text-accent-gold" />
                                <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">Poll by {isCreatorSelf ? "You" : poll.creator.username}</span>
                              </div>
                              <h4 className="font-serif font-bold text-foreground text-lg leading-snug">{poll.question}</h4>
                            </div>
                            {!poll.is_active && <span className="shrink-0 text-[10px] font-bold uppercase bg-foreground/5 px-2 py-1 rounded-md text-foreground/40">Closed</span>}
                          </div>
                          
                          <div className="space-y-2.5">
                            {poll.options.map((opt: any) => {
                              const percentage = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
                              const isVoted = poll.user_vote === opt.id;
                              
                              return (
                                <button 
                                  key={opt.id}
                                  disabled={!poll.is_active || !group.is_member}
                                  onClick={() => handleVote(poll.id, opt.id)}
                                  className={`relative w-full text-left p-3 rounded-xl border transition-all overflow-hidden group ${
                                    isVoted 
                                      ? 'border-accent-gold bg-accent-gold/5' 
                                      : 'border-foreground/10 bg-background hover:border-accent-gold/40'
                                  }`}
                                >
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-accent-gold/10 transition-all duration-1000" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <div className="relative flex justify-between items-center text-sm">
                                    <span className="font-serif font-bold flex items-center gap-2 text-foreground/80 group-hover:text-foreground">
                                      {opt.text}
                                      {isVoted && <CheckCircle2 className="w-4 h-4 text-accent-gold" />}
                                    </span>
                                    <span className="text-xs font-bold text-foreground/40">{percentage}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-3 mt-3 flex items-center justify-between border-t border-foreground/5 text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                            <span>{poll.total_votes} total votes</span>
                            <span>{new Date(poll.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        {group.is_member ? (
          <div className="p-4 bg-card-bg border-t border-foreground/5 shrink-0 z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowCreatePoll(true)}
                  className="p-3 text-foreground/40 hover:text-accent-gold hover:bg-foreground/5 rounded-xl transition-all shrink-0 sm:hidden"
                >
                  <BarChart2 className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message the group..."
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-3.5 px-5 pr-14 text-sm focus:outline-none focus:border-accent-gold/50 focus:bg-background transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-gold text-white rounded-xl hover:scale-105 transition-all disabled:opacity-30 disabled:scale-100 disabled:hover:scale-100"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-card-bg border-t border-foreground/5 shrink-0 text-center">
            <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Join the group to chat and vote</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Group Info */}
      <AnimatePresence>
        {showRightSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="border-l border-foreground/5 bg-card-bg shrink-0 flex flex-col z-20 absolute sm:relative inset-y-0 right-0 shadow-2xl sm:shadow-none"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-foreground/5 shrink-0">
              <h3 className="font-serif font-bold text-lg">Group Info</h3>
              <button onClick={() => setShowRightSidebar(false)} className="sm:hidden text-foreground/40 hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Info Section */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-accent-gold/10 mx-auto mb-4 flex items-center justify-center overflow-hidden border border-accent-gold/20">
                  {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : <span className="font-serif font-bold text-accent-gold text-2xl">{group.name[0]}</span>}
                </div>
                <h4 className="font-serif font-bold text-lg leading-tight mb-1">{group.name}</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-4">{group.is_public ? 'Public' : 'Private'} Group</p>
                <p className="text-sm text-foreground/60 font-serif italic mb-6 leading-relaxed">{group.description}</p>
                
                <div className="flex flex-col gap-2">
                  {group.is_member && (
                    <button 
                      onClick={() => setIsAddFriendModalOpen(true)}
                      className="w-full py-2.5 bg-foreground/5 border border-foreground/10 text-foreground text-sm font-bold rounded-xl hover:bg-foreground/10 hover:border-accent-gold/30 transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4 text-accent-gold" />
                      Add Friends
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleJoinLeave}
                      disabled={joining}
                      className={`py-2.5 text-sm font-bold rounded-xl border transition-all ${
                        group.is_member 
                          ? "text-red-500 border-red-500/20 hover:bg-red-500/10" 
                          : "bg-accent-gold text-white border-transparent hover:shadow-lg shadow-accent-gold/20"
                      }`}
                    >
                      {joining ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : group.is_member ? "Leave Group" : "Join Group"}
                    </button>

                    {group.role === 'creator' && (
                      <button 
                        onClick={handleDeleteGroup}
                        className="py-2.5 text-sm font-bold rounded-xl border border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-gold" /> Members
                  </h5>
                  <span className="text-[10px] font-bold text-foreground/30">{group.member_count}</span>
                </div>
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div key={member.profile.id} className="relative group">
                      <div className="flex items-center gap-3">
                        <Link href={`/dashboard/profile/${member.profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-foreground/5 border border-foreground/10 overflow-hidden shrink-0 group-hover:border-accent-gold/40 transition-colors">
                            {member.profile.avatar_url ? (
                              <img src={member.profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-foreground/40">{member.profile.username[0]}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-serif font-bold text-foreground truncate group-hover:text-accent-gold transition-colors">{member.profile.username}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 truncate">{member.role}</p>
                          </div>
                        </Link>

                        {/* Admin Actions */}
                        {(group.role === 'admin' || group.role === 'creator') && member.profile.id !== currentUser?.id && member.role !== 'creator' && (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                setMemberActionUser(memberActionUser === member.profile.id ? null : member.profile.id);
                              }}
                              className="p-1.5 rounded-lg text-foreground/20 hover:text-accent-gold hover:bg-foreground/5 transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                              {memberActionUser === member.profile.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-40 bg-card-bg border border-foreground/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                >
                                    <div className="divide-y divide-foreground/5">
                                      {member.role === 'member' ? (
                                        <button 
                                          onClick={() => handleUpdateRole(member.profile.id, 'admin')}
                                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-foreground/60 hover:bg-accent-gold/10 hover:text-accent-gold transition-colors flex items-center gap-2"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" /> Make Admin
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => handleUpdateRole(member.profile.id, 'member')}
                                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-foreground/60 hover:bg-accent-gold/10 hover:text-accent-gold transition-colors flex items-center gap-2"
                                        >
                                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Revoke Admin
                                        </button>
                                      )}

                                      {group.role === 'creator' && member.role === 'admin' && (
                                        <button 
                                          onClick={() => handleUpdateRole(member.profile.id, 'creator')}
                                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-accent-gold hover:bg-accent-gold/10 transition-colors flex items-center gap-2"
                                        >
                                          <Star className="w-3.5 h-3.5 fill-accent-gold" /> Transfer Ownership
                                        </button>
                                      )}

                                      <button 
                                        onClick={() => handleRemoveMember(member.profile.id)}
                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                      >
                                        <UserX className="w-3.5 h-3.5" /> Remove Member
                                      </button>
                                    </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Books Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-serif font-bold text-foreground text-sm flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-accent-gold" /> Shared Books
                  </h5>
                  {group.is_member && (
                    <button 
                      onClick={() => setContributeModalOpen(true)}
                      className="text-[10px] font-bold text-accent-gold hover:text-accent-gold/80 transition-colors uppercase tracking-widest flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                
                {(!group.books || group.books.length === 0) ? (
                  <p className="text-xs text-foreground/40 font-serif italic text-center py-4">No books shared yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {group.books.slice(0, 6).map((item) => (
                      <div key={item.id} className="aspect-[2/3] bg-foreground/5 rounded-lg overflow-hidden relative group">
                        {item.book.thumbnail ? (
                          <img src={item.book.thumbnail} className="w-full h-full object-cover" title={item.book.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1 text-center">
                            <span className="text-[8px] font-serif italic text-foreground/30 line-clamp-3">{item.book.title}</span>
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-sm">
                           <button 
                             onClick={() => setRecommendBook({ id: item.book.id, title: item.book.title })}
                             className="p-1.5 bg-accent-gold text-white rounded-md hover:scale-110 transition-transform"
                           >
                             <Share2 className="w-3 h-3" />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {recommendBook && (
        <RecommendationModal 
          isOpen={!!recommendBook}
          onClose={() => setRecommendBook(null)}
          bookId={recommendBook.id}
          bookTitle={recommendBook.title}
        />
      )}

      <ContributeBookModal 
        isOpen={isContributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        groupId={id}
        onSuccess={fetchData}
      />

      {/* Create Poll Modal */}
      <AnimatePresence>
        {showCreatePoll && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <div className="w-full max-w-md bg-card-bg border border-foreground/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 blur-[50px] -mr-16 -mt-16" />
               <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-accent-gold" />
                    Create Poll
                  </h3>
                  <button onClick={() => setShowCreatePoll(false)} className="p-2 text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Question</label>
                    <input 
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Ask the group something..."
                      className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-accent-gold/50 focus:bg-background transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Options</label>
                    {pollOptions.map((opt, i) => (
                      <input 
                        key={i}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[i] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-accent-gold/50 focus:bg-background transition-all"
                      />
                    ))}
                    <button 
                      onClick={addOption}
                      className="text-[10px] font-bold text-accent-gold hover:text-accent-gold/80 flex items-center gap-1 mt-2 uppercase tracking-widest"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  </div>

                  <button 
                    onClick={handleCreatePoll}
                    className="w-full py-3.5 bg-accent-gold text-white rounded-xl font-bold shadow-lg shadow-accent-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                  >
                    Send to Chat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Add Friend Modal */}
      <AnimatePresence>
        {isAddFriendModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card-bg border border-foreground/10 rounded-[2.5rem] p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-serif font-bold text-foreground">Add Friends</h3>
                <button onClick={() => setIsAddFriendModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-foreground/40" />
                </button>
              </div>

              <div className="relative mb-6">
                <input 
                  type="text"
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-3 pl-11 text-sm focus:outline-none focus:border-accent-gold/40 transition-all font-serif"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {friends
                  .filter(f => {
                    const friend = f.initiator.id === currentUser?.id ? f.receiver : f.initiator;
                    const isAlreadyMember = group.members.some(m => m.profile.id === friend.id);
                    return !isAlreadyMember && friend.username.toLowerCase().includes(friendSearch.toLowerCase());
                  })
                  .map(f => {
                    const friend = f.initiator.id === currentUser?.id ? f.receiver : f.initiator;
                    return (
                      <div key={friend.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-foreground/5 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold font-serif font-bold overflow-hidden border border-accent-gold/10">
                            {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover" /> : friend.username[0]}
                          </div>
                          <span className="font-serif font-bold text-foreground">{friend.username}</span>
                        </div>
                        <button 
                          onClick={() => handleAddFriend(friend.id)}
                          className="px-4 py-1.5 bg-background border border-foreground/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-foreground/60 hover:bg-accent-gold hover:text-white hover:border-accent-gold transition-all"
                        >
                          Add
                        </button>
                      </div>
                    );
                  })}
                {friends.length === 0 && (
                  <p className="text-center py-8 text-foreground/30 font-serif italic text-sm">No friends to add.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
