import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyTokenType,
  parseOAuthScopes,
  analyzeTokenScopes,
  validateGitHubToken
} from "@repopilot/github";
import { GET as loginHandler } from "../../src/app/api/auth/github/login/route";
import { GET as callbackHandler } from "../../src/app/api/auth/github/callback/route";
import { NextRequest } from "next/server";

describe("Task 6: Private Repo Access, Token Scopes & GitHub App OAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Token Classification & Scope Parsing", () => {
    it("correctly classifies token prefixes", () => {
      expect(classifyTokenType("github_pat_11ABCD_123456")).toBe("fine-grained");
      expect(classifyTokenType("ghp_0123456789abcdef")).toBe("classic");
      expect(classifyTokenType("gho_oauth_access_token_123")).toBe("oauth");
      expect(classifyTokenType("custom_token_format")).toBe("unknown");
    });

    it("parses comma-separated scopes from x-oauth-scopes header", () => {
      const header = "repo, user:email, read:org";
      expect(parseOAuthScopes(header)).toEqual(["repo", "user:email", "read:org"]);
      expect(parseOAuthScopes(null)).toEqual([]);
      expect(parseOAuthScopes("")).toEqual([]);
    });

    it("detects elevated broad scopes and flags warnings", () => {
      // Elevated scopes
      const broadAnalysis = analyzeTokenScopes(["repo", "admin:org", "workflow"], "classic");
      expect(broadAnalysis.hasBroadScopes).toBe(true);
      expect(broadAnalysis.elevatedScopes).toContain("admin:org");
      expect(broadAnalysis.elevatedScopes).toContain("workflow");
      expect(broadAnalysis.warning).toContain("Token has broad scopes");
      expect(broadAnalysis.warning).toContain("read-only");

      // Minimal read-only / public scope
      const minimalAnalysis = analyzeTokenScopes(["public_repo"], "classic");
      expect(minimalAnalysis.hasBroadScopes).toBe(false);
      expect(minimalAnalysis.elevatedScopes).toHaveLength(0);

      // Fine-grained token
      const fineGrainedAnalysis = analyzeTokenScopes([], "fine-grained");
      expect(fineGrainedAnalysis.hasBroadScopes).toBe(false);
      expect(fineGrainedAnalysis.recommendation).toContain("Fine-grained token detected");
    });
  });

  describe("Token Validation API Integration", () => {
    it("returns error on empty token", async () => {
      const res = await validateGitHubToken("");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("Token cannot be empty.");
    });

    it("validates successful response from GitHub API and parses scopes & user", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          "x-oauth-scopes": "repo, read:org",
          "x-ratelimit-limit": "5000",
          "x-ratelimit-remaining": "4988",
          "x-ratelimit-reset": "1730000000"
        }),
        json: async () => ({
          login: "octocat",
          name: "The Octocat"
        })
      });

      const result = await validateGitHubToken("ghp_valid_test_token_123", {
        fetchFn: mockFetch as any
      });

      expect(result.valid).toBe(true);
      expect(result.user).toBe("octocat");
      expect(result.tokenType).toBe("classic");
      expect(result.scopes).toEqual(["repo", "read:org"]);
      expect(result.rateLimit?.limit).toBe(5000);
      expect(result.rateLimit?.remaining).toBe(4988);
      // 'repo' is flagged as broad because it grants write access
      expect(result.hasBroadScopes).toBe(true);
    });

    it("handles 401 Bad credentials response cleanly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers()
      });

      const result = await validateGitHubToken("ghp_bad_credential_token", {
        fetchFn: mockFetch as any
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("401 Bad credentials");
    });
  });

  describe("GitHub App OAuth Feature Flag & Routes", () => {
    it("returns 403 by default when ENABLE_GITHUB_APP_OAUTH is disabled", async () => {
      delete process.env.ENABLE_GITHUB_APP_OAUTH;
      delete process.env.NEXT_PUBLIC_ENABLE_GITHUB_APP_OAUTH;

      const loginReq = new NextRequest("http://localhost:3000/api/auth/github/login");
      const loginRes = await loginHandler(loginReq);
      expect(loginRes.status).toBe(403);
      const loginBody = await loginRes.json();
      expect(loginBody.error).toContain("disabled by default");

      const callbackReq = new NextRequest("http://localhost:3000/api/auth/github/callback?code=abc&state=xyz");
      const callbackRes = await callbackHandler(callbackReq);
      expect(callbackRes.status).toBe(403);
    });

    it("generates cryptographic state and PKCE code_challenge when OAuth is enabled", async () => {
      process.env.ENABLE_GITHUB_APP_OAUTH = "true";
      process.env.GITHUB_CLIENT_ID = "Iv1.test_client_id_12345";

      const req = new NextRequest("http://localhost:3000/api/auth/github/login");
      const res = await loginHandler(req);

      expect(res.status).toBe(307); // Redirect to GitHub
      const location = res.headers.get("location");
      expect(location).toBeDefined();

      const authUrl = new URL(location!);
      expect(authUrl.hostname).toBe("github.com");
      expect(authUrl.pathname).toBe("/login/oauth/authorize");
      expect(authUrl.searchParams.get("client_id")).toBe("Iv1.test_client_id_12345");
      expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
      expect(authUrl.searchParams.get("code_challenge")).toBeTruthy();
      expect(authUrl.searchParams.get("state")).toBeTruthy();

      // Verify state cookie is set with HttpOnly and Lax
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain("repopilot_oauth_state=");
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
    });

    it("rejects callback if state parameter does not match state cookie (anti-CSRF)", async () => {
      process.env.ENABLE_GITHUB_APP_OAUTH = "true";
      process.env.GITHUB_CLIENT_ID = "Iv1.test_client_id";
      process.env.GITHUB_CLIENT_SECRET = "test_client_secret";

      const req = new NextRequest(
        "http://localhost:3000/api/auth/github/callback?code=fake_code&state=attack_state",
        {
          headers: {
            cookie: "repopilot_oauth_state=genuine_state:verifier123"
          }
        }
      );

      const res = await callbackHandler(req);
      expect(res.status).toBe(400);
      const html = await res.text();
      expect(html).toContain("CSRF verification failed");
    });
  });
});
