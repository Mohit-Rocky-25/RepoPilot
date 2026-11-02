/**
 * Google Authentication & Session Security Module
 *
 * Implements lightweight, secure HMAC-SHA256 signed session tokens
 * (zero external JWT library dependencies) and PKCE OAuth helpers for Google OpenID Connect.
 */
import crypto from "node:crypto";
import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "github" | "demo";
}

export interface SessionPayload {
  user: AuthUser;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = "repopilot_user_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "repopilot_google_oauth_state";

const DEFAULT_SECRET = "repopilot-secret-salt-key-dev-3849102830192840912";

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

/**
 * Base64URL encode/decode helpers
 */
function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

/**
 * Signs an AuthUser into a tamper-proof session token.
 * Format: <header>.<payload>.<signature>
 */
export function signSessionToken(user: AuthUser, expiresInSeconds = 30 * 24 * 3600): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64urlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(dataToSign);
  const signature = base64urlEncode(hmac.digest());

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): AuthUser | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(dataToSign);
  const expectedSignature = base64urlEncode(hmac.digest());

  // Timing safe comparison to protect against timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload.user;
  } catch {
    return null;
  }
}

/**
 * Extracts authenticated user from NextRequest cookies
 */
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySessionToken(cookie);
}

/**
 * Checks whether production Google OAuth credentials are configured
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Generates the Google OAuth 2.0 Authorization URL
 */
export function getGoogleAuthUrl(origin: string, state: string, codeChallenge: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = new URL("/api/auth/google/callback", origin).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  return authUrl.toString();
}

