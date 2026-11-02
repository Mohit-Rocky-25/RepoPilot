import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
  getRequestOrigin,
  generatePKCE,
  GOOGLE_OAUTH_CONFIG
} from "@/lib/googleAuth";
import { getSupabaseConfig } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * Initiates Official Google OAuth 2.0 / OpenID Connect authorization flow.
 * Supports direct Google Cloud Web Application OAuth or Supabase Google Provider.
 */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/";
  const redirectUri = resolveGoogleRedirectUri(origin);

  // 1. Check if Supabase Google OAuth is configured
  const supabase = getSupabaseConfig();
  if (supabase.isConfigured && supabase.url) {
    const supabaseOAuthUrl = new URL("/auth/v1/authorize", supabase.url);
    supabaseOAuthUrl.searchParams.set("provider", "google");
    supabaseOAuthUrl.searchParams.set(
      "redirect_to",
      `${origin}/api/auth/supabase/callback?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    return NextResponse.redirect(supabaseOAuthUrl.toString());
  }

  // 2. Direct Official Google Cloud OAuth
  if (isGoogleAuthConfigured()) {
    const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
    const state = crypto.randomBytes(32).toString("base64url");
    const { codeVerifier, codeChallenge } = generatePKCE();

    const authUrl = new URL(GOOGLE_OAUTH_CONFIG.authEndpoint);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", GOOGLE_OAUTH_CONFIG.scopes.join(" "));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "select_account");

    const cookiePayload = `${state}:${codeVerifier}:${encodeURIComponent(returnUrl)}`;
    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set(GOOGLE_OAUTH_CONFIG.cookieStateName, cookiePayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_CONFIG.stateTtlSeconds
    });

    return response;
  }

  // 3. Neither Google nor Supabase credentials configured in environment
  const wantsJson =
    req.headers.get("accept")?.includes("application/json") ||
    req.nextUrl.searchParams.get("format") === "json";

  if (wantsJson) {
    return NextResponse.json(
      {
        error: "Google OAuth credentials not configured.",
        configured: false,
        activeOrigin: origin,
        redirectUri,
        resolution: {
          step1: "Open Google Cloud Console Credentials",
          directUrl: "https://console.cloud.google.com/apis/credentials",
          step2: "Create OAuth 2.0 Client ID for Web application",
          step3: `Add Authorized JavaScript origins: ${origin}`,
          step4: `Add Authorized redirect URIs: ${redirectUri}`,
          step5:
            "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables (.env.local locally or Vercel Project Settings for production)."
        }
      },
      { status: 503 }
    );
  }

  const fallbackUrl = new URL("/settings", origin);
  fallbackUrl.searchParams.set("auth_error", "google_credentials_missing");
  return NextResponse.redirect(fallbackUrl.toString());
}
