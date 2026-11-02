import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isGoogleAuthConfigured,
  getGoogleAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE
} from "@/lib/auth";

/**
 * Initiates Google OAuth 2.0 PKCE flow.
 *
 * If GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET are configured:
 *   Redirects to Google Cloud Identity endpoint.
 * If not configured:
 *   Redirects to demo test login for seamless development & offline evaluation.
 */
export async function GET(req: NextRequest) {
  const isDemo = req.nextUrl.searchParams.get("demo") === "true";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/history";

  if (!isGoogleAuthConfigured() || isDemo) {
    // Redirect to Demo Authentication handler
    const demoUrl = new URL("/api/auth/google/demo", req.nextUrl.origin);
    demoUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(demoUrl.toString());
  }

  // 1. Generate cryptographic state for CSRF defense
  const state = crypto.randomBytes(32).toString("base64url");

  // 2. Generate PKCE code_verifier (RFC 7636)
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // 3. Compute code_challenge = Base64URL(SHA256(code_verifier))
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const authUrl = getGoogleAuthUrl(req.nextUrl.origin, state, codeChallenge);
  const response = NextResponse.redirect(authUrl);

  // Store state and verifier in short-lived HttpOnly SameSite=Lax cookie (10 min TTL)
  const cookieValue = `${state}:${codeVerifier}:${encodeURIComponent(returnTo)}`;
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });

  return response;
}

