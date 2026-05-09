"use client";

import { useState, useEffect, useRef } from "react";
import { User, Shield, Save, Loader2, Key, Check, X, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";
import { useProfile } from "@/context/ProfileContext";

export default function SettingsPage() {
  const { profile, refreshProfile, loading: profileLoading } = useProfile();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [formData, setFormData] = useState({
    username: "",
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await api.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
      });
    }
  }, [profile]);

  const checkUsername = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      const results = await api.get(`/api/users/search/?q=${username}`);
      const isTaken = results.some((u: any) => u.username?.toLowerCase() === username.toLowerCase() && u.id !== user?.id);
      setUsernameStatus(isTaken ? 'taken' : 'available');
    } catch (err) {
      setUsernameStatus('idle');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!supabase) {
      addToast({ title: "Dev Mode Limitation", description: "Avatar uploads require Supabase Storage. This feature is disabled in Zero-Config mode.", type: "error" });
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast({ title: "Invalid File", description: "Please select an image file.", type: "error" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await api.patch("/api/profile/", { avatar_url: publicUrl });
      await refreshProfile(); // SYNC GLOBAL STATE
      
      addToast({ title: "Avatar Updated", description: "Your profile picture has been updated.", type: "success" });
    } catch (err: any) {
      console.error("Upload error:", err);
      addToast({ title: "Upload Failed", description: err.message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') {
      addToast({ title: "Username Taken", description: "This username is already taken.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.patch("/api/profile/", formData);
      await refreshProfile(); // SYNC GLOBAL STATE
      addToast({ title: "Profile Updated", description: "Your profile has been successfully updated.", type: "success" });
      setTimeout(() => setSaving(false), 800);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaving(false);
      addToast({ title: "Error", description: "Failed to save changes.", type: "error" });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    if (!supabase) {
      addToast({ title: "Dev Mode Limitation", description: "Password resets require Supabase Auth. This feature is disabled in Zero-Config mode.", type: "error" });
      return;
    }
    
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
      });
      if (error) throw error;
      addToast({ 
        title: "Reset Email Sent", 
        description: `A password reset link has been sent to ${user.email}.`, 
        type: "success" 
      });
    } catch (err: any) {
      addToast({ title: "Failed to Send", description: err.message, type: "error" });
    } finally {
      setResetting(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-20">
      <header className="text-center">
        <h1 className="text-4xl font-serif font-bold text-foreground">Profile Settings</h1>
        <p className="text-foreground/40 italic font-serif mt-2">Manage your profile information and security credentials.</p>
      </header>

      <div className="space-y-8">
        {/* Avatar Section */}
        <section className="bg-card-bg rounded-3xl border border-foreground/5 p-8 shadow-sm text-center relative overflow-hidden">
          <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-32 h-32 rounded-full border-4 border-accent-gold/20 bg-accent-gold/5 flex items-center justify-center text-4xl font-serif font-bold text-accent-gold overflow-hidden shadow-xl mx-auto transition-all group-hover:border-accent-gold/40">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile?.username || "S").charAt(0).toUpperCase()
              )}
            </div>
            
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white w-8 h-8" />
            </div>
            
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                <div className="w-full h-1 bg-white/20 absolute bottom-4 px-4 overflow-hidden rounded-full">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="h-full bg-accent-gold w-1/2"
                  />
                </div>
              </div>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleAvatarUpload}
          />
          
          <h2 className="text-xl font-serif font-bold text-foreground mt-4">{profile?.full_name || profile?.name || "User"}</h2>
          <p className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.3em]">{user?.email}</p>
          <p className="text-[10px] text-foreground/30 mt-2 font-bold uppercase">Click portrait to update</p>
        </section>

        {/* Identity Section */}
        <section className="bg-card-bg rounded-3xl border border-foreground/5 p-8 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-foreground mb-6 flex items-center gap-3">
            <User className="w-5 h-5 text-accent-gold" />
            Identity
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] ml-1">Username</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({...formData, username: e.target.value});
                    checkUsername(e.target.value);
                  }}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-accent-gold/40 transition-all font-serif"
                  placeholder="Your username"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-accent-gold animate-spin" />}
                  {usernameStatus === 'available' && <Check className="w-4 h-4 text-accent-green" />}
                  {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {usernameStatus === 'taken' && <p className="text-xs text-red-400 ml-1 mt-1 font-medium">This username is already taken.</p>}
              {usernameStatus === 'available' && <p className="text-xs text-accent-green ml-1 mt-1 font-medium">This username is available.</p>}
            </div>

            <button 
              onClick={handleSave}
              disabled={saving || usernameStatus === 'checking' || (usernameStatus === 'taken' && formData.username !== profile?.username)}
              className="w-full bg-accent-green text-white rounded-2xl py-4 font-serif font-bold flex items-center justify-center gap-2 hover:bg-[#5a712a] transition-all disabled:opacity-50 shadow-lg shadow-accent-green/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-card-bg rounded-3xl border border-foreground/5 p-8 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent-gold" />
            Security
          </h3>
          <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent-gold/10 rounded-xl">
                  <Key className="w-5 h-5 text-accent-gold" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-foreground">Update Password</h4>
                  <p className="text-xs text-foreground/40 mt-0.5">We'll send a reset link to your registered email.</p>
                </div>
              </div>
              <button 
                onClick={handlePasswordReset}
                disabled={resetting}
                className="px-6 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground text-sm font-bold rounded-xl transition-all border border-foreground/10 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Link"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
