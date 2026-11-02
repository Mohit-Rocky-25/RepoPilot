"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { GoogleUser } from "@/lib/googleAuth";
import { getSupabaseClient, getSupabaseConfig, setDynamicSupabaseConfig } from "@/lib/supabaseClient";

interface AuthContextType {
  user: GoogleUser | null;
  loading: boolean;
  isConfigured: boolean;
  googleConfigured: boolean;
  supabaseConfigured: boolean;
  signInWithGoogle: (returnUrl?: string) => void;
  signInWithSupabase: (returnUrl?: string) => Promise<void>;
  signInWithEmail: (email: string, name?: string) => Promise<GoogleUser>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize from sessionStorage to eliminate any visual flash
  const [user, setUser] = useState<GoogleUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("REPOPILOT_GOOGLE_USER");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  // Sync user state to sessionStorage and optionally server
  const persistUser = useCallback((newUser: GoogleUser | null, syncServer: boolean = true) => {
    setUser(newUser);
    if (typeof window !== "undefined") {
      try {
        if (newUser) {
          sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(newUser));
          if (syncServer) {
            fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: newUser })
            }).catch(() => {});
          }
        } else {
          sessionStorage.removeItem("REPOPILOT_GOOGLE_USER");
        }
      } catch {}
    }
  }, []);

  // Fetch session & configuration from server
  const refreshSession = useCallback(async () => {
    try {
      const [sessRes, confRes] = await Promise.all([
        fetch("/api/auth/google/session"),
        fetch("/api/auth/configure")
      ]);

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData.authenticated && sessData.user) {
          persistUser(sessData.user, false);
        } else if (!user) {
          setUser(null);
        }
      }

      if (confRes.ok) {
        const confData = await confRes.json();
        setGoogleConfigured(Boolean(confData.google?.isConfigured));
        setSupabaseConfigured(Boolean(confData.supabase?.isConfigured));

        if (confData.supabase?.isConfigured && confData.supabase?.url && confData.supabase?.anonKey) {
          setDynamicSupabaseConfig(confData.supabase.url, confData.supabase.anonKey);
        }
      }
    } catch {
      // Ignore background fetch failure
    } finally {
      setLoading(false);
    }
  }, [persistUser, user]);

  // Sign In using Supabase Google OAuth
  const signInWithSupabase = useCallback(async (returnUrl: string = "/") => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      if (typeof window !== "undefined") {
        window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      }
      return;
    }

    const redirectUri = typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/supabase/callback?returnUrl=${encodeURIComponent(returnUrl)}`
      : "http://localhost:3000/api/auth/supabase/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.url && typeof window !== "undefined") {
      window.location.href = data.url;
    }
  }, []);

  // Sign In using direct Google OAuth (auto-delegates to Supabase if configured)
  const signInWithGoogle = useCallback((returnUrl: string = "/") => {
    const supabase = getSupabaseClient();
    if (supabase) {
      signInWithSupabase(returnUrl).catch(() => {
        if (typeof window !== "undefined") {
          window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
        }
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }, [signInWithSupabase]);

  // Listen to Supabase client auth events & hash tokens (e.g. #access_token=... returned by Google)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // 1. Initial check for existing Supabase session or URL hash fragment
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const gUser: GoogleUser = {
            id: session.user.id,
            email: session.user.email || "user@google.com",
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Google User",
            givenName:
              session.user.user_metadata?.given_name ||
              session.user.user_metadata?.name?.split(" ")[0] ||
              "User",
            picture:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture,
            emailVerified: Boolean(session.user.email_confirmed_at)
          };
          persistUser(gUser, true);

          // Remove hash from URL for clean address bar
          if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        }
      });

      // 2. Real-time auth state listener
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          const gUser: GoogleUser = {
            id: session.user.id,
            email: session.user.email || "user@google.com",
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0] ||
              "Google User",
            givenName:
              session.user.user_metadata?.given_name ||
              session.user.user_metadata?.name?.split(" ")[0] ||
              "User",
            picture:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture,
            emailVerified: Boolean(session.user.email_confirmed_at)
          };
          persistUser(gUser, true);

          if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        } else if (event === "SIGNED_OUT") {
          persistUser(null, false);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    };

    // Attach immediately if client already available
    setupListener();

    // Re-verify and attach after fetching config
    refreshSession().then(() => {
      setupListener();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [persistUser, refreshSession]);

  // Sign In using direct Email
  const signInWithEmail = async (email: string, name?: string): Promise<GoogleUser> => {
    const res = await fetch("/api/auth/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "demo",
        email: email.trim(),
        name: name?.trim()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    persistUser(data.user, false);
    return data.user;
  };

  // Sign Out cleanly across all stores
  const signOut = async () => {
    try {
      await fetch("/api/auth/google/logout", { method: "POST" });
    } catch {}

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    persistUser(null, false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const isConfigured = googleConfigured || supabaseConfigured;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured,
        googleConfigured,
        supabaseConfigured,
        signInWithGoogle,
        signInWithSupabase,
        signInWithEmail,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
