import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
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
};
