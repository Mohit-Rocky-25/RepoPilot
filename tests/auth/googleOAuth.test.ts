import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
  generatePKCE,
  encodeSignedSession,
  decodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  GoogleSessionData
} from "../../src/lib/googleAuth";
import { GET as loginHandler } from "../../src/app/api/auth/google/login/route";
import { GET as callbackHandler } from "../../src/app/api/auth/google/callback/route";
import { GET as sessionHandler } from "../../src/app/api/auth/google/session/route";
import { POST as logoutHandler } from "../../src/app/api/auth/google/logout/route";

describe("Google OAuth 2.0 / OpenID Connect Implementation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Configuration and Helper Utilities", () => {
    it("reports configured status accurately", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      expect(isGoogleAuthConfigured()).toBe(false);

      process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "";
      expect(isGoogleAuthConfigured()).toBe(false);

      process.env.GOOGLE_CLIENT_SECRET = "GOCSPX-mock-secret";
      expect(isGoogleAuthConfigured()).toBe(true);
    });

    it("resolves redirect URI correctly based on origin", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const uri = resolveGoogleRedirectUri("http://localhost:3000");
      expect(uri).toBe("http://localhost:3000/api/auth/google/callback");
    });

    it("generates valid PKCE verifier and challenge pair (RFC 7636)", () => {
      const { codeVerifier, codeChallenge } = generatePKCE();
      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(codeChallenge).not.toBe(codeVerifier);
    });

    it("signs, verifies, and rejects tampered session tokens", () => {
      const mockSession: GoogleSessionData = {
        user: {
          id: "google-12345",
          email: "developer@example.com",
          name: "Developer",
          picture: "https://example.com/photo.jpg"
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000
      };

      const signedToken = encodeSignedSession(mockSession);
      expect(signedToken).toContain(".");

      const decoded = decodeSignedSession(signedToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.user.email).toBe("developer@example.com");

      // Tampered token check
      const tampered = signedToken.slice(0, -4) + "XXXX";
      expect(decodeSignedSession(tampered)).toBeNull();

      // Expired token check
      const expiredSession: GoogleSessionData = {
        ...mockSession,
        expiresAt: Date.now() - 1000
      };
      const expiredToken = encodeSignedSession(expiredSession);
      expect(decodeSignedSession(expiredToken)).toBeNull();
    });
  });

  describe("Login Endpoint (/api/auth/google/login)", () => {
    it("returns 503 JSON with resolution guide when credentials missing and format=json", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const req = new NextRequest("http://localhost:3000/api/auth/google/login?format=json");
      const res = await loginHandler(req);

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.configured).toBe(false);
      expect(json.resolution.directUrl).toBe("https://console.cloud.google.com/apis/credentials");
    });

    it("redirects with auth_error param when credentials missing and browsing normally", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const req = new NextRequest("http://localhost:3000/api/auth/google/login?returnUrl=/settings");
      const res = await loginHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("auth_error=google_credentials_missing");
    });

    it("generates state and redirects to Google auth URL when configured", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-id.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "mock-secret";

      const req = new NextRequest("http://localhost:3000/api/auth/google/login");
      const res = await loginHandler(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(location).toContain("client_id=mock-id.apps.googleusercontent.com");
      expect(location).toContain("code_challenge=");

      const cookie = res.cookies.get(GOOGLE_OAUTH_CONFIG.cookieStateName);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toContain(":");
    });
  });

  describe("Callback Endpoint (/api/auth/google/callback)", () => {
    it("renders friendly diagnostic HTML if Google returns access_denied", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/google/callback?error=access_denied");
      const res = await callbackHandler(req);

      expect(res.status).toBe(400);
      const html = await res.text();
      expect(html).toContain("Google Cloud Consent Screen Error");
      expect(html).toContain("Test users");
    });

    it("rejects request if state cookie is missing or mismatch", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/google/callback?code=mock-code&state=mock-state");
      const res = await callbackHandler(req);

      expect(res.status).toBe(400);
      const html = await res.text();
      expect(html).toContain("OAuth session expired or missing state cookie");
    });

    it("exchanges code, fetches userinfo, and sets session cookie on success", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-id.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "mock-secret";

      const state = "valid-state-123";
      const verifier = "valid-verifier-456";

      // Mock Google Token & UserInfo endpoints
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("oauth2.googleapis.com/token")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              access_token: "mock-google-access-token",
              id_token: "mock-id-token"
            })
          });
        }
        if (url.includes("googleapis.com/oauth2/v3/userinfo")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              sub: "google-uid-999",
              email: "alice@example.com",
              name: "Alice Engineer",
              given_name: "Alice",
              picture: "https://lh3.googleusercontent.com/photo.jpg",
              email_verified: true
            })
          });
        }
        return Promise.reject(new Error("Unexpected endpoint"));
      });
      global.fetch = mockFetch;

      const req = new NextRequest(
        `http://localhost:3000/api/auth/google/callback?code=mock-auth-code&state=${state}`,
        {
          headers: {
            cookie: `${GOOGLE_OAUTH_CONFIG.cookieStateName}=${state}:${verifier}:%2Fsettings`
          }
        }
      );

      const res = await callbackHandler(req);
      expect(res.status).toBe(200);

      const sessionCookie = res.cookies.get(GOOGLE_OAUTH_CONFIG.cookieSessionName);
      expect(sessionCookie).toBeDefined();

      const decoded = decodeSignedSession(sessionCookie!.value);
      expect(decoded?.user.email).toBe("alice@example.com");
      expect(decoded?.user.name).toBe("Alice Engineer");
    });
  });

  describe("Session and Logout Endpoints", () => {
    it("reports unauthenticated when no session cookie exists", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/google/session");
      const res = await sessionHandler(req);
      const json = await res.json();

      expect(json.authenticated).toBe(false);
      expect(json.user).toBeNull();
    });

    it("returns user profile when session cookie is valid", async () => {
      const mockSession: GoogleSessionData = {
        user: {
          id: "google-uid-111",
          email: "bob@example.com",
          name: "Bob Dev"
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000
      };
      const signedToken = encodeSignedSession(mockSession);

      const req = new NextRequest("http://localhost:3000/api/auth/google/session", {
        headers: {
          cookie: `${GOOGLE_OAUTH_CONFIG.cookieSessionName}=${signedToken}`
        }
      });
      const res = await sessionHandler(req);
      const json = await res.json();

      expect(json.authenticated).toBe(true);
      expect(json.user.email).toBe("bob@example.com");
    });

    it("logout deletes the session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/google/logout", {
        method: "POST"
      });
      const res = await logoutHandler(req);
      expect(res.status).toBe(200);

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain("repopilot_google_session=;");
    });
  });
});
