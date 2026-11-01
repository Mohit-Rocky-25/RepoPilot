import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isOAuthEnabled } from "@/lib/featureFlags";

/**
 * Initiates GitHub App OAuth 2.0 Authorization Flow with PKCE (RFC 7636).
 *
 * Feature-Flagged: Disabled by default (ENABLE_GITHUB_APP_OAUTH=false).
 * Security: Uses high-entropy state and SHA-256 PKCE code_challenge.
 */
export async function GET(req: NextRequest) {
  if (!isOAuthEnabled()) {
    return NextResponse.json(
      {
        error: "GitHub App OAuth is disabled by default. Set ENABLE_GITHUB_APP_OAUTH=true in environment to enable.",
        enabled: false
      },
      { status: 403 }
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: "GITHUB_CLIENT_ID is not configured on the server.",
        enabled: true
      },
      { status: 500 }
    );
  }

  // 1. Generate cryptographic state for CSRF protection
  const state = crypto.randomBytes(32).toString("base64url");

  // 2. Generate PKCE code_verifier (43-128 chars base64url)
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // 3. Compute code_challenge = Base64URL(SHA256(code_verifier))
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const redirectUri = new URL("/api/auth/github/callback", req.nextUrl.origin).toString();

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // Store state and verifier in short-lived HttpOnly SameSite=Lax cookie (10 min TTL)
  const cookieValue = `${state}:${codeVerifier}`;
  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set("repopilot_oauth_state", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });

  return response;
}
