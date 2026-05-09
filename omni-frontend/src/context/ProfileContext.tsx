"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

interface Profile {
  id: string;
  username: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  is_dev_mode?: boolean;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async () => {
    try {
      const user = await api.getUser();
      if (user) {
        const data = await api.get("/api/profile/");
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching profile context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        fetchProfile();
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      loading, 
      refreshProfile: fetchProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
