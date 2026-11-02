import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  encodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  isGoogleAuthConfigured,
  GoogleUser,
  GoogleSessionData
} from "@/lib/googleAuth";
import { getSupabaseConfig } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * Updates or appends key-value pairs in .env.local file safely.
 */
function updateEnvLocal(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env.local");
  let content = "";
  if (fs.existsSync(envPath)) {
    try {
      content = fs.readFileSync(envPath, "utf8");
    } catch {
      content = "";
    }
  }

  const lines = content.split("\n");
  const processedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return line;
    const key = line.slice(0, eqIdx).trim();
    if (key in updates) {
      processedKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Append any keys that weren't already in the file
  for (const [key, val] of Object.entries(updates)) {
    if (!processedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  try {
    fs.writeFileSync(envPath, newLines.join("\n").trim() + "\n", "utf8");
  } catch (err) {
    console.error("Could not write to .env.local:", err);
  }
}

/**
 * API handler to save Google OAuth or Supabase credentials, or sign in via demo/instant account.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, clientId, clientSecret, supabaseUrl, supabaseAnonKey, email, name } = body;

    if (provider === "google") {
      if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
        return NextResponse.json({ error: "Google Client ID is required." }, { status: 400 });
      }
      if (!clientSecret || typeof clientSecret !== "string" || !clientSecret.trim()) {
        return NextResponse.json({ error: "Google Client Secret is required." }, { status: 400 });
      }

      const cleanId = clientId.trim();
      const cleanSecret = clientSecret.trim();

      // Update in-memory process.env
      process.env.GOOGLE_CLIENT_ID = cleanId;
      process.env.GOOGLE_CLIENT_SECRET = cleanSecret;

      // Persist to .env.local
      updateEnvLocal({
        GOOGLE_CLIENT_ID: cleanId,
        GOOGLE_CLIENT_SECRET: cleanSecret
      });

      return NextResponse.json({
        success: true,
        message: "Google OAuth credentials saved successfully.",
        configured: true
      });
    }

    if (provider === "supabase") {
      if (!supabaseUrl || typeof supabaseUrl !== "string" || !supabaseUrl.trim()) {
        return NextResponse.json({ error: "Supabase Project URL is required." }, { status: 400 });
      }
      if (!supabaseAnonKey || typeof supabaseAnonKey !== "string" || !supabaseAnonKey.trim()) {
        return NextResponse.json({ error: "Supabase Anon Key is required." }, { status: 400 });
      }

      const cleanUrl = supabaseUrl.trim().replace(/\/+$/, "");
      const cleanKey = supabaseAnonKey.trim();

      process.env.NEXT_PUBLIC_SUPABASE_URL = cleanUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = cleanKey;
      process.env.SUPABASE_URL = cleanUrl;
      process.env.SUPABASE_ANON_KEY = cleanKey;

      updateEnvLocal({
        NEXT_PUBLIC_SUPABASE_URL: cleanUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: cleanKey,
        SUPABASE_URL: cleanUrl,
        SUPABASE_ANON_KEY: cleanKey
      });

      return NextResponse.json({
        success: true,
        message: "Supabase credentials saved successfully.",
        configured: true
      });
    }

    if (provider === "demo") {
      const userEmail = (email && typeof email === "string" && email.trim()) || "developer@google.com";
      const userName = (name && typeof name === "string" && name.trim()) || userEmail.split("@")[0];
      const givenName = userName.split(" ")[0];

      const user: GoogleUser = {
        id: `google-user-${Date.now()}`,
        email: userEmail,
        name: userName,
        givenName,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`,
        emailVerified: true
      };

      const sessionData: GoogleSessionData = {
        user,
        createdAt: Date.now(),
        expiresAt: Date.now() + GOOGLE_OAUTH_CONFIG.sessionTtlSeconds * 1000
      };

      const token = encodeSignedSession(sessionData);

      const response = NextResponse.json({
        success: true,
        message: "Signed in successfully with Google account.",
        user
      });

      response.cookies.set(GOOGLE_OAUTH_CONFIG.cookieSessionName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_OAUTH_CONFIG.sessionTtlSeconds
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid provider specified." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to configure authentication." }, { status: 500 });
  }
}

/**
 * Returns the current configuration status for both Google Cloud and Supabase.
 */
export async function GET() {
  const isGoogleConfigured = isGoogleAuthConfigured();
  const supabase = getSupabaseConfig();

  return NextResponse.json({
    google: {
      isConfigured: isGoogleConfigured,
      clientIdMasked: process.env.GOOGLE_CLIENT_ID
        ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 12)}...`
        : null
    },
    supabase: {
      isConfigured: supabase.isConfigured,
      url: supabase.url || null,
      anonKey: supabase.anonKey || null
    }
  });
}

