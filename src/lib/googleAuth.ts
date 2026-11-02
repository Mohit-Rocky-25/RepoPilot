import crypto from "node:crypto";

export interface GoogleUser {
  id: string; // OpenID subject (sub)
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  emailVerified?: boolean;
}

export interface GoogleSessionData {
  user: GoogleUser;
  createdAt: number;
  expiresAt: number;
}

export const GOOGLE_OAUTH_CONFIG = {
  authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
  scopes: ["openid", "email", "profile"],
  cookieStateName: "repopilot_google_oauth_state",
  cookieSessionName: "repopilot_google_session",
  sessionTtlSeconds: 7 * 24 * 60 * 60, // 7 days
  stateTtlSeconds: 10 * 60 // 10 minutes
};

/**
 * Checks whether Google OAuth 2.0 credentials are configured in the environment.
 */
export function isGoogleAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(
    clientId &&
    clientId.trim() !== "" &&
    clientSecret &&
    clientSecret.trim() !== ""
  );
}

/**
 * Resolves the OAuth redirect URI for Google callback dynamically from origin.
 */
export function resolveGoogleRedirectUri(origin?: string): string {
  if (origin && (origin.startsWith("http://") || origin.startsWith("https://"))) {
    return new URL("/api/auth/google/callback", origin).toString();
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL("/api/auth/google/callback", baseUrl).toString();
}

/**
 * Derives request origin dynamically accounting for reverse proxies (e.g. Vercel, Cloudflare).
 */
export function getRequestOrigin(req: { headers: { get: (name: string) => string | null }; nextUrl?: { origin: string } }): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return req.nextUrl?.origin || "http://localhost:3000";
}

/**
 * Generates cryptographic PKCE code verifier and challenge (RFC 7636).
 */
export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

/**
 * Signs a session payload with HMAC-SHA256 to prevent client-side tampering.
 */
function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "repopilot-default-dev-signing-secret-change-in-production"
  );
}

export function encodeSignedSession(session: GoogleSessionData): string {
  const json = JSON.stringify(session);
  const payloadBase64 = Buffer.from(json, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

export function decodeSignedSession(token: string): GoogleSessionData | null {
  if (!token || !token.includes(".")) return null;
  const [payloadBase64, providedSig] = token.split(".");
  if (!payloadBase64 || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadBase64)
    .digest("base64url");

  // Constant-time comparison
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))
  ) {
    return null;
  }

  try {
    const json = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const session: GoogleSessionData = JSON.parse(json);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null; // Expired
    }
    return session;
  } catch {
    return null;
  }
}
