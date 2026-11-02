import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  isConfigured: boolean;
}

/**
 * Checks whether Supabase credentials exist in the environment or client.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) ||
    (typeof window !== "undefined" && (window as any).__REPOPILOT_SUPABASE_URL);

  const anonKey =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
    (typeof window !== "undefined" && (window as any).__REPOPILOT_SUPABASE_ANON_KEY);

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
 * Creates or retrieves a Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured || !url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

