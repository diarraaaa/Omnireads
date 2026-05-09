"use client";

import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { api } from "@/lib/api";
import { 
  BookOpen, 
  LayoutDashboard, 
  Search, 
  PlusCircle, 
  Settings, 
  LogOut,
  User,
  Bell,
  Menu,
  X,
  MessageSquare,
  Star
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import useSWR from "swr";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, loading: profileLoading } = useProfile();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const fetcher = (url: string) => api.get(url);
  
  const { data: unreadData, mutate: mutateUnread } = useSWR(user ? "/api/messages/unread_count/" : null, fetcher, {
    refreshInterval: 15000, // Faster polling for better UX
    revalidateOnFocus: true,
  });
  
  // Re-fetch unread counts when path changes
  useEffect(() => {
    mutateUnread();
  }, [pathname, mutateUnread]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await api.getUser();
      if (!user && !supabase) {
        // This case should theoretically not happen with api.getUser fallback
        setUser({ email: "dev@omnireads.local", id: "00000000-0000-0000-0000-000000000000" });
      } else if (!user) {
        router.push("/auth/signin");
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, [router, supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/discover?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navItems = [
    { name: "My Library", href: "/dashboard", icon: LayoutDashboard },
    { name: "Discover", href: "/dashboard/discover", icon: Search },
    { name: "Friends", href: "/dashboard/friends", icon: User },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    { name: "Recommendations", href: "/dashboard/recommendations", icon: Star },
    { name: "Groups", href: "/dashboard/groups", icon: BookOpen },
    { name: "Add Book", href: "/dashboard/add", icon: PlusCircle },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (!user || profileLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-2 bg-accent-gold/20 rounded-xl blur-lg animate-pulse" />
            <div className="relative p-4 bg-gradient-to-br from-accent-green to-[#3a4a1a] rounded-xl shadow-xl">
              <BookOpen className="w-10 h-10 text-background animate-bounce" />
            </div>
          </div>
          <p className="text-sm font-serif italic text-foreground/40 animate-pulse">Loading Omnireads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-card-bg border-r border-foreground/5 z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-12">
            <div className="relative group">
              <div className="absolute -inset-2 bg-accent-gold/20 rounded-xl blur-lg group-hover:bg-accent-gold/30 transition-all" />
              <div className="relative p-2.5 bg-gradient-to-br from-accent-green to-[#3a4a1a] rounded-xl shadow-xl">
                <BookOpen className="w-6 h-6 text-background" />
              </div>
            </div>
            <span className="text-2xl font-serif italic font-bold tracking-tight bg-gradient-to-r from-accent-gold to-[#c5a059] bg-clip-text text-transparent">OmniReads</span>
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                      ? "bg-accent-green text-white shadow-xl shadow-accent-green/20" 
                      : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active"
                      className="absolute inset-0 bg-gradient-to-r from-accent-green to-[#5a712a]"
                    />
                  )}
                  <item.icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? "text-white" : "text-foreground/30 group-hover:text-accent-gold"}`} />
                  <span className="font-serif font-bold text-sm relative z-10 flex-1">{item.name}</span>
                  
                  {/* Badges */}
                  {item.name === "Messages" && unreadData?.messages > 0 && (
                    <span className="relative z-10 bg-accent-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      {unreadData.messages}
                    </span>
                  )}
                  {item.name === "Recommendations" && unreadData?.recommendations > 0 && (
                    <span className="relative z-10 bg-accent-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      {unreadData.recommendations}
                    </span>
                  )}
                  {item.name === "Groups" && unreadData?.groups > 0 && (
                    <span className="relative z-10 bg-accent-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      {unreadData.groups}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-8 mt-auto border-t border-foreground/5 space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-accent-gold/20 to-[#c5a059]/20 border border-accent-gold/30 flex items-center justify-center text-accent-gold font-bold shadow-inner overflow-hidden">
                   {profile?.avatar_url ? (
                     <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     (profile?.username || user?.email?.[0] || "S").toUpperCase().charAt(0)
                   )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-green rounded-full border-2 border-card-bg shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif font-bold text-foreground truncate">{profile?.username || profile?.name || user?.email?.split("@")[0]}</p>
                <p className="text-[10px] font-medium text-foreground/30 truncate uppercase tracking-widest">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                if (supabase) {
                  await supabase.auth.signOut();
                }
                router.push("/");
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-foreground/40 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 group"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="font-serif font-bold text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`lg:ml-72 min-h-screen transition-all duration-500`}>
        {/* Dev Mode Banner - Only show if ACTUALLY using zero-config (mock user) */}
        {profile?.is_dev_mode && user?.isMock && (
          <div className="bg-accent-gold/90 backdrop-blur-md text-background px-10 py-2.5 flex items-center justify-between z-[100] sticky top-0 border-b border-background/10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-background/20 rounded-lg">
                <Settings className="w-4 h-4 text-background animate-spin-slow" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] font-serif">
                <span className="opacity-70">Running in</span> Zero-Config Developer Mode
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
              <span>Local SQLite</span>
              <span className="w-1 h-1 bg-background/30 rounded-full" />
              <span>Mock Auth</span>
              <span className="w-1 h-1 bg-background/30 rounded-full" />
              <span>No Cloud Dependencies</span>
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`sticky ${profile?.is_dev_mode && user?.isMock ? 'top-[45px]' : 'top-0'} w-full h-24 bg-background/60 backdrop-blur-2xl border-b border-foreground/5 z-30 px-10 flex items-center justify-between transition-all`}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 lg:hidden text-foreground/60 hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>

          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-4 bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-2.5 w-[400px] group focus-within:border-accent-gold/30 transition-all">
            <Search className="w-4 h-4 text-foreground/30 group-focus-within:text-accent-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search books..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-foreground/80 placeholder:text-foreground/20 font-serif"
            />
          </form>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {user?.isMock ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-accent-gold/10 border border-accent-gold/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                  <span className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">Zero-Config Dev Mode</span>
                </div>
              ) : null}
            </div>
            
            <div className="flex items-center gap-4 border-l border-foreground/5 pl-6">
              <button className="p-2.5 bg-foreground/5 rounded-xl text-foreground/40 hover:text-accent-gold hover:bg-accent-gold/10 transition-all relative group">
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-gold rounded-full border-2 border-background shadow-sm" />
              </button>
              
              <Link href="/dashboard/settings" className="relative group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-gold/10 to-accent-gold/5 border border-accent-gold/20 flex items-center justify-center text-accent-gold font-bold overflow-hidden transition-all group-hover:border-accent-gold/40 shadow-sm">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.username || user?.email?.[0] || "S").toUpperCase().charAt(0)
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
