import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  let token = null;

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } else if (process.env.NODE_ENV === "development") {
    // Fallback token for local development when Supabase is not configured
    token = "mock-token";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.detail || errorData.error || errorData.message || "An unknown error occurred";
    console.error(`API Error [${res.status}] ${path}:`, errorData);
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  get:    (path: string)               => apiFetch(path),
  post:   (path: string, body: object) => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  (path: string, body: object) => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path: string)               => apiFetch(path, { method: "DELETE" }),
  getSupabase: () => createClient(),
  getUser: async () => {
    const supabase = createClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return { 
      id: "00000000-0000-0000-0000-000000000000", 
      email: "dev@omnireads.local",
      user_metadata: { name: "Developer" },
      isMock: true
    };
  },
};
