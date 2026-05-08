"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  User, 
  ChevronLeft,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  ShieldCheck,
  X,
  FileIcon,
  ImageIcon,
  Book as BookIcon,
  BookOpen
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import BookSelectionModal from "@/components/BookSelectionModal";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  other_user: Profile;
  last_message: Message;
  unread_count: number;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUserId = searchParams.get("user_id");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [convLoading, setConvLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const { addToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [friends, setFriends] = useState<Profile[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'friends'>('messages');
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EMOJIS = ["📖", "📜", "🖋️", "🦉", "🕯️", "🔍", "🕰️", "🏰", "🎭", "🍷", "🍂", "🌑", "🏛️", "📚", "✨", "🤝", "💭", "🧠", "🔥", "💫", "🌟", "🌍", "🌹", "🖤"];
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    async function init() {
      try {
        const [user, convList, friendshipData] = await Promise.all([
          api.get("/api/profile/"),
          api.get("/api/messages/conversations/"),
          api.get("/api/friends/")
        ]);

        setCurrentUser(user);
        setConversations(convList);
        const friendProfiles = friendshipData.map((f: any) => 
          f.initiator.id === user.id ? f.receiver : f.initiator
        );
        setFriends(friendProfiles);

        if (initialUserId) {
          const profile = await api.get(`/api/profile/${initialUserId}/`);
          setActiveConversation(profile);
          const exists = convList.some((c: Conversation) => c.other_user.id === initialUserId);
          if (!exists) {
            setConversations([{
              other_user: profile,
              last_message: { id: '', sender_id: '', receiver_id: '', content: 'New Chat', is_read: true, created_at: new Date().toISOString() },
              unread_count: 0
            } as any, ...convList]);
          }
        }
      } catch (err) {
        console.error("Failed to init messages:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [initialUserId]);

  const fetcher = (url: string) => api.get(url);
  const { data: messages = [], mutate } = useSWR<Message[]>(
    activeConversation ? `/api/messages/?user_id=${activeConversation.id}` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true }
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeConversation || sending) return;

    setSending(true);
    try {
      let fileData = {};
      if (selectedFile) {
        const supabase = api.getSupabase();
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        fileData = {
          file_url: publicUrl,
          file_type: selectedFile.type,
          file_name: selectedFile.name
        };
      }

      const resp = await api.post("/api/messages/", {
        receiver_id: activeConversation.id,
        content: newMessage.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ""),
        ...fileData
      });
      mutate();
      setNewMessage("");
      setSelectedFile(null);
      setConversations(prev => {
        const index = prev.findIndex(c => c.other_user.id === activeConversation.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index].last_message = resp;
          return updated.sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());
        }
        return prev;
      });
    } catch (err) {
      addToast({ title: "Failed to Send", description: "Could not send your message.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleRecommendBook = async (book: { id: string, title: string }) => {
    if (!activeConversation) return;
    
    setSending(true);
    try {
      await api.post("/api/recommendations/send/", {
        to_user_id: activeConversation.id,
        book_id: book.id,
        message: "Check out this book!"
      });
      
      addToast({ 
        title: "Recommendation Shared", 
        description: `You recommended "${book.title}"`, 
        type: "success" 
      });
      
      // Refresh messages to show the new recommendation card
      mutate();
    } catch (err) {
      addToast({ title: "Failed to recommend", description: "Could not share book.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({ title: "File too large", description: "Files must be smaller than 5MB.", type: "error" });
        return;
      }
      setSelectedFile(file);
      // Reset input value so the same file can be selected again if removed
      e.target.value = '';
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    // Keep picker open for multiple emojis
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-accent-gold animate-spin" />
        <p className="font-serif italic text-foreground/40">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] min-h-[600px] flex gap-6">
      {/* Sidebar: Conversations */}
      <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col bg-card-bg rounded-3xl border border-foreground/5 shadow-xl overflow-hidden ${activeConversation ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 border-b border-foreground/5">
          <h2 className="text-xl font-serif font-bold text-foreground mb-4">Messages</h2>
          
          <div className="flex bg-foreground/5 p-1 rounded-xl mb-4">
            <button 
              onClick={() => setSidebarTab('messages')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${sidebarTab === 'messages' ? 'bg-card-bg text-accent-gold shadow-sm' : 'text-foreground/40 hover:text-foreground'}`}
            >
              Recent
            </button>
            <button 
              onClick={() => setSidebarTab('friends')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${sidebarTab === 'friends' ? 'bg-card-bg text-accent-gold shadow-sm' : 'text-foreground/40 hover:text-foreground'}`}
            >
              Friends
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
            <input 
              type="text" 
              placeholder={sidebarTab === 'messages' ? "Search messages..." : "Search friends..."}
              className="w-full bg-foreground/5 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent-gold/30 placeholder:text-foreground/20"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sidebarTab === 'messages' ? (
            conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 text-foreground/5 mx-auto mb-4" />
                <p className="text-xs text-foreground/30 font-serif italic">No messages yet.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.other_user.id}
                  onClick={() => setActiveConversation(conv.other_user)}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                    activeConversation?.id === conv.other_user.id 
                      ? 'bg-accent-gold/10 border border-accent-gold/10' 
                      : 'hover:bg-foreground/5 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-foreground/5 bg-foreground/5 overflow-hidden flex items-center justify-center">
                      {conv.other_user.avatar_url ? (
                        <img src={conv.other_user.avatar_url} alt={conv.other_user.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-foreground/20" />
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-card-bg">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="font-serif font-bold text-sm text-foreground truncate">{conv.other_user.username}</h4>
                      <span className="text-[10px] text-foreground/20">{new Date(conv.last_message.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-foreground/80 font-medium' : 'text-foreground/40 font-serif italic'}`}>
                      {conv.last_message.content}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : (
            friends.length === 0 ? (
              <div className="text-center py-12 px-4">
                <User className="w-10 h-10 text-foreground/5 mx-auto mb-4" />
                <p className="text-xs text-foreground/30 font-serif italic">Your friend list is empty.</p>
                <Link href="/dashboard/discover" className="text-[10px] text-accent-gold uppercase font-bold hover:underline mt-2 inline-block">Find Friends</Link>
              </div>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setActiveConversation(friend);
                    setSidebarTab('messages');
                  }}
                  className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                    activeConversation?.id === friend.id 
                      ? 'bg-accent-gold/10 border border-accent-gold/10' 
                      : 'hover:bg-foreground/5 border border-transparent'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-foreground/5 bg-foreground/5 overflow-hidden flex items-center justify-center">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-foreground/20" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-serif font-bold text-sm text-foreground truncate">{friend.username}</h4>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Start Chat</p>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-card-bg rounded-3xl border border-foreground/5 shadow-2xl overflow-hidden relative ${!activeConversation ? 'hidden lg:flex items-center justify-center text-center p-12' : 'flex'}`}>
        {!activeConversation ? (
          <div className="max-w-sm">
            <div className="w-20 h-20 bg-accent-gold/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-accent-gold/20" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-foreground mb-2">Select a Chat</h3>
            <p className="text-sm text-foreground/40 font-serif italic">Choose a friend to start messaging.</p>
          </div>
        ) : (
          <>
            <div className="p-4 lg:p-6 border-b border-foreground/5 flex items-center justify-between bg-card-bg/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveConversation(null)} className="lg:hidden p-2 text-foreground/40 hover:text-foreground">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full border border-foreground/5 bg-foreground/5 overflow-hidden flex items-center justify-center">
                  {activeConversation.avatar_url ? (
                    <img src={activeConversation.avatar_url} alt={activeConversation.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-foreground/20" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-foreground leading-none mb-1">{activeConversation.username}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                    <span className="text-[10px] text-foreground/30 uppercase tracking-widest font-bold">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-green/5 border border-accent-green/10 text-accent-green text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Secure
                </div>
                <button className="p-2 text-foreground/20 hover:text-foreground transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-card-bg/30">
              {convLoading && messages.length === 0 ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-accent-gold/20 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p className="font-serif italic text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg: Message, i: number) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i-1].created_at).getTime() > 1000 * 60 * 30;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[10px] text-foreground/20 font-bold uppercase tracking-[0.2em] mb-4 w-full text-center">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-accent-gold text-white rounded-tr-none shadow-lg shadow-accent-gold/10' 
                            : 'bg-foreground/5 text-foreground rounded-tl-none border border-foreground/5'
                        }`}
                      >
                        {msg.content && (() => {
                          if (msg.content.startsWith("[BOOK_RECOMMENDATION]:")) {
                            const parts = msg.content.split(":");
                            const bookId = parts[1];
                            const bookTitle = parts[2];
                            const recMessage = parts.slice(3).join(":");
                            return (
                              <div className="space-y-3">
                                <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                                  isMe ? 'bg-white/10 border-white/20' : 'bg-background/40 border-foreground/10'
                                }`}
                                onClick={() => router.push(`/dashboard/books/${bookId}`)}
                                >
                                  <div className="w-12 h-18 bg-foreground/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                                    <BookIcon className="w-6 h-6 text-foreground/20" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Book Recommendation</p>
                                    <h4 className="font-serif font-bold text-sm truncate">{bookTitle}</h4>
                                    <p className="text-[10px] italic opacity-60">View Book →</p>
                                  </div>
                                </div>
                                {recMessage && (
                                  <p className={isMe ? 'font-medium' : 'font-serif italic'}>{recMessage}</p>
                                )}
                              </div>
                            );
                          }
                          return <p className={isMe ? 'font-medium' : 'font-serif italic'}>{msg.content}</p>;
                        })()}
                        
                        {msg.file_url && (
                          <div className={`mt-2 ${msg.content ? 'pt-2 border-t border-white/10' : ''}`}>
                            {msg.file_type?.startsWith('image/') ? (
                              <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded-xl shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.file_url, '_blank')} />
                            ) : (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-foreground/5 hover:bg-foreground/10'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/10' : 'bg-foreground/10'}`}>
                                  <FileIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold truncate">{msg.file_name}</p>
                                  <p className={`text-[8px] uppercase tracking-wider opacity-60`}>Download</p>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </motion.div>
                      {i === messages.length - 1 && isMe && (
                        <span className="text-[9px] text-foreground/20 mt-1.5 font-bold uppercase tracking-widest">
                          {msg.is_read ? 'Seen' : 'Delivered'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-card-bg/80 backdrop-blur-xl border-t border-foreground/5">
              <form onSubmit={sendMessage} className="flex items-end gap-3">
                <div className="flex-1 bg-foreground/5 border border-foreground/5 rounded-2xl p-2 focus-within:ring-1 focus-within:ring-accent-gold/20 transition-all relative">
                  
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mx-2 mb-2 p-2 bg-accent-gold/5 border border-accent-gold/20 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent-gold/10 rounded-lg flex items-center justify-center text-accent-gold">
                          {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                        </div>
                        <div className="text-[10px]">
                          <p className="font-bold text-foreground truncate max-w-[150px]">{selectedFile.name}</p>
                          <p className="text-foreground/40 font-mono uppercase">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }} className="p-1 hover:bg-foreground/5 rounded-full">
                        <X className="w-3 h-3 text-foreground/40" />
                      </button>
                    </div>
                  )}

                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={selectedFile ? "Add a description..." : "Type a message..."}
                    className="w-full bg-transparent border-none resize-none p-3 text-sm focus:ring-0 placeholder:text-foreground/20 placeholder:font-serif placeholder:italic min-h-[48px] max-h-32"
                  />

                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-1 relative">
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 transition-colors ${showEmojiPicker ? 'text-accent-gold' : 'text-foreground/20 hover:text-accent-gold'}`}
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            ref={emojiPickerRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-4 p-3 bg-card-bg border border-foreground/10 rounded-2xl shadow-2xl z-50 grid grid-cols-6 gap-2 w-max min-w-[240px]"
                          >
                            {EMOJIS.map(emoji => (
                              <button 
                                key={emoji} 
                                type="button" 
                                onClick={() => addEmoji(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-foreground/5 rounded-lg transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 text-foreground/20 hover:text-accent-gold transition-colors ${selectedFile ? 'text-accent-gold' : ''}`}
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setIsBookModalOpen(true)}
                        className="p-2 text-foreground/20 hover:text-accent-gold transition-colors"
                        title="Recommend a book"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </div>
                    <span className="text-[10px] text-foreground/10 font-mono">{newMessage.length}/1000</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="w-14 h-14 rounded-2xl bg-accent-gold text-white flex items-center justify-center shadow-lg shadow-accent-gold/20 hover:bg-accent-gold/90 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </button>
              </form>
              <p className="mt-4 text-[9px] text-foreground/20 text-center uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Messages are encrypted
              </p>
            </div>

            <BookSelectionModal 
              isOpen={isBookModalOpen}
              onClose={() => setIsBookModalOpen(false)}
              onSelect={handleRecommendBook}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-accent-gold animate-spin" />
        <p className="font-serif italic text-foreground/40">Loading messages...</p>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
