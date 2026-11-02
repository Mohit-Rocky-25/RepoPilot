import { describe, it, expect, beforeEach } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  isGoogleAuthConfigured,
  getGoogleAuthUrl,
  AuthUser
} from "@/lib/auth";
import {
  WorkspaceSnapshot,
  clearInMemoryStoreForTesting,
  getAllSnapshots,
  saveSnapshot
} from "@/lib/workspaceStore";

describe("Google Authentication & Session Security (Phase B)", () => {
  const sampleUser: AuthUser = {
    id: "usr_google_109283019283",
    email: "architect@example.com",
    name: "Ada Lovelace",
    picture: "https://example.com/avatar.jpg",
    provider: "google"
  };

  it("should generate a valid 3-part HMAC-SHA256 signed session token", () => {
    const token = signSessionToken(sampleUser);
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });

  it("should successfully verify and decode an authentic session token", () => {
    const token = signSessionToken(sampleUser);
    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(sampleUser.id);
    expect(decoded?.email).toBe(sampleUser.email);
    expect(decoded?.name).toBe(sampleUser.name);
    expect(decoded?.provider).toBe("google");
  });

  it("should reject a tampered session token (signature mismatch)", () => {
    const token = signSessionToken(sampleUser);
    const parts = token.split(".");
    // Tamper with payload (modify user email)
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        user: { ...sampleUser, email: "attacker@evil.com" },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })
    ).toString("base64url");

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const result = verifySessionToken(tamperedToken);
    expect(result).toBeNull();
  });

  it("should reject an expired session token", () => {
    // Expire 10 seconds ago
    const expiredToken = signSessionToken(sampleUser, -10);
    const result = verifySessionToken(expiredToken);
    expect(result).toBeNull();
  });

  it("should construct compliant Google OAuth 2.0 PKCE authorization URLs", () => {
    const origin = "https://repopilot.dev";
    const state = "random_state_xyz123";
    const challenge = "sha256_code_challenge_abc456";

    const urlString = getGoogleAuthUrl(origin, state, challenge);
    const url = new URL(urlString);

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://repopilot.dev/api/auth/google/callback");
  });
});

describe("Cloud Sync Conflict Resolution Engine", () => {
  beforeEach(() => {
    clearInMemoryStoreForTesting();
  });

  it("should prioritize latest updated timestamp when merging snapshots", async () => {
    const olderSnapshot: WorkspaceSnapshot = {
      id: "snap_sync_1",
      title: "Initial Analysis",
      repoFullName: "vercel/swr",
      owner: "vercel",
      repo: "swr",
      commitSha: "a1b2c3d4e5f6",
      defaultBranch: "main",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
      tags: ["cache"],
      notes: "First pass",
      pinnedFiles: ["src/index.ts"],
      assistantMessages: []
    };

    const newerSnapshot: WorkspaceSnapshot = {
      ...olderSnapshot,
      title: "Updated Deep Investigation",
      updatedAt: "2026-11-02T12:00:00.000Z",
      notes: "Updated with stack trace and root cause",
      tags: ["cache", "fixed"]
    };

    // Save initial
    await saveSnapshot(olderSnapshot);
    let all = await getAllSnapshots();
    expect(all[0].title).toBe("Initial Analysis");

    // Save updated
    await saveSnapshot(newerSnapshot);
    all = await getAllSnapshots();
    expect(all.length).toBe(1);
    expect(all[0].title).toBe("Updated Deep Investigation");
    expect(all[0].tags).toContain("fixed");
  });
});
