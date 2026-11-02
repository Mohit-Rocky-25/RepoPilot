import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as configureHandler, GET as configureStatusHandler } from "../../src/app/api/auth/configure/route";
import { getSupabaseConfig, getSupabaseClient } from "../../src/lib/supabaseClient";

describe("Supabase & Authentication Configuration API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("checks Supabase configuration accurately", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    expect(getSupabaseConfig().isConfigured).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
    expect(getSupabaseConfig().isConfigured).toBe(true);
    expect(getSupabaseClient()).not.toBeNull();
  });

  it("rejects invalid configure requests", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "unknown" })
    });
    const res = await configureHandler(req);
    expect(res.status).toBe(400);
  });

  it("handles instant demo login cleanly", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "demo",
        email: "testuser@gmail.com",
        name: "Test User"
      })
    });
    const res = await configureHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("testuser@gmail.com");
    expect(res.cookies.get("repopilot_google_session")).toBeDefined();
  });

  it("returns configuration status from GET", async () => {
    const res = await configureStatusHandler();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.google).toBeDefined();
    expect(data.supabase).toBeDefined();
  });
});

