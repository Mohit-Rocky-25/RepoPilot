import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

/**
 * Checks whether Supabase credentials exist in the environment, client storage, or window.
 */
export function getSupabaseConfig(): SupabaseConfig {
  let url =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) ||
    (typeof window !== "undefined" && (window as any).__REPOPILOT_SUPABASE_URL);

  let anonKey =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
    (typeof window !== "undefined" && (window as any).__REPOPILOT_SUPABASE_ANON_KEY);

  // Check localStorage if in browser and not found in env
  if (typeof window !== "undefined") {
    if (!url) {
      try {
        url = localStorage.getItem("repopilot_supabase_url") || undefined;
      } catch {}
    }
    if (!anonKey) {
      try {
        anonKey = localStorage.getItem("repopilot_supabase_anon_key") || undefined;
      } catch {}
    }
  }

  const isConfigured = Boolean(
    url &&
    typeof url === "string" &&
    url.trim() !== "" &&
    anonKey &&
    typeof anonKey === "string" &&
    anonKey.trim() !== ""
  );

  return {
    url: url ? url.trim() : undefined,
    anonKey: anonKey ? anonKey.trim() : undefined,
    isConfigured
  };
}

/**
 * Dynamically configures Supabase in the browser and caches the client.
 */
export function setDynamicSupabaseConfig(url: string, anonKey: string): SupabaseClient {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  const cleanKey = anonKey.trim();

  if (typeof window !== "undefined") {
    (window as any).__REPOPILOT_SUPABASE_URL = cleanUrl;
    (window as any).__REPOPILOT_SUPABASE_ANON_KEY = cleanKey;
    try {
      localStorage.setItem("repopilot_supabase_url", cleanUrl);
      localStorage.setItem("repopilot_supabase_anon_key", cleanKey);
    } catch {}
  }

  cachedUrl = cleanUrl;
  cachedKey = cleanKey;
  cachedClient = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}

/**
 * Creates or retrieves a cached Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured || !url || !anonKey) {
    return null;
  }

  // Reuse cached client if config matches
  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }

  cachedUrl = url;
  cachedKey = anonKey;
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}
