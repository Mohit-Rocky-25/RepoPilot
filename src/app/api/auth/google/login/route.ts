import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
  getRequestOrigin,
  generatePKCE,
  GOOGLE_OAUTH_CONFIG
} from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/**
 * Initiates Official Google OAuth 2.0 / OpenID Connect authorization flow with PKCE (RFC 7636).
 */
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/settings";
  const redirectUri = resolveGoogleRedirectUri(origin);

  // 1. Verify if Google OAuth credentials exist in environment
  if (!isGoogleAuthConfigured()) {
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

    const fallbackUrl = new URL(returnUrl, origin);
    fallbackUrl.searchParams.set("auth_error", "google_credentials_missing");
    return NextResponse.redirect(fallbackUrl.toString());
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();

  // 2. High-entropy state for CSRF protection
  const state = crypto.randomBytes(32).toString("base64url");

  // 3. PKCE code verifier and challenge
  const { codeVerifier, codeChallenge } = generatePKCE();

  // 4. Construct Official Google OAuth 2.0 URL
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

  // 5. Pack state, verifier, and returnUrl in HttpOnly cookie
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
