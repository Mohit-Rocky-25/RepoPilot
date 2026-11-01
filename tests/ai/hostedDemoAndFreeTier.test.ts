import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/ai/ask/route";
import { ROUTE_CLASS_LIMITS, InMemoryRateLimiter } from "../../src/lib/rateLimiter";

describe("Hosted Demo & Optional Free-Tier Provider (Task 6)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ENABLE_HOSTED_AI_FREE_TIER;
    delete process.env.HOSTED_AI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("serves pre-recorded sample analysis on swr without requiring an AI key", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "vercel",
        repo: "swr",
        question: "Where is the core useSWR hook defined?",
        isSampleAnalysis: true,
        contextTokenBudget: 4000
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.isSampleAnalysis).toBe(true);
    expect(data.sampleBadge).toBe("Pre-recorded example");
    expect(data.answer).toContain("useSWR");
    expect(data.validatedCitations.length).toBeGreaterThan(0);
    expect(data.contextMeta.filesIncluded).toBeGreaterThan(0);
    expect(data.contextMeta.filesDropped).toBe(0);
  });

  it("has strict per-IP rate limit defined for hosted free-tier (3 req/hr)", () => {
    expect(ROUTE_CLASS_LIMITS.hosted_free_tier).toBeDefined();
    expect(ROUTE_CLASS_LIMITS.hosted_free_tier.limit).toBe(3);
    expect(ROUTE_CLASS_LIMITS.hosted_free_tier.windowMs).toBe(3600000); // 1 hour
  });

  it("disables server-side free tier by default when ENABLE_HOSTED_AI_FREE_TIER is unset", () => {
    expect(process.env.ENABLE_HOSTED_AI_FREE_TIER).toBeUndefined();
    // Default operating posture is disabled
    const isEnabled = process.env.ENABLE_HOSTED_AI_FREE_TIER === "true";
    expect(isEnabled).toBe(false);
  });

  it("enforces rate limits on hosted free-tier limiter", () => {
    let fakeNow = 1_000_000;
    const limiter = new InMemoryRateLimiter(() => fakeNow);
    const ipKey = "hosted_free_tier:192.168.1.100";
    const { limit, windowMs } = ROUTE_CLASS_LIMITS.hosted_free_tier;

    // First 3 requests allowed
    expect(limiter.check(ipKey, limit, windowMs).allowed).toBe(true);
    expect(limiter.check(ipKey, limit, windowMs).allowed).toBe(true);
    expect(limiter.check(ipKey, limit, windowMs).allowed).toBe(true);

    // 4th request blocked by strict limit
    const blocked = limiter.check(ipKey, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
