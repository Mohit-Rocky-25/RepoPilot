import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  InMemoryRateLimiter,
  CompositeRateLimiter,
  getClientIp,
  enforceRateLimit,
  checkPayloadSize,
  buildRateLimitHeaders,
  ROUTE_CLASS_LIMITS
} from "../../src/lib/rateLimiter";

describe("Rate Limiter - InMemory with Fake Clock", () => {
  it("enforces sliding-window limit and resets when clock advances past window", () => {
    let fakeNow = 1_000_000;
    const limiter = new InMemoryRateLimiter(() => fakeNow);

    const key = "test:user:1";
    const limit = 3;
    const windowMs = 60_000; // 60s

    // 1st request
    const r1 = limiter.check(key, limit, windowMs);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    // 2nd request
    const r2 = limiter.check(key, limit, windowMs);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    // 3rd request
    const r3 = limiter.check(key, limit, windowMs);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request within window -> blocked
    const r4 = limiter.check(key, limit, windowMs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetInSeconds).toBe(60);

    // Advance clock by 30 seconds -> still blocked
    fakeNow += 30_000;
    const r5 = limiter.check(key, limit, windowMs);
    expect(r5.allowed).toBe(false);
    expect(r5.resetInSeconds).toBe(30);

    // Advance clock past the window (another 31s -> 61s total) -> reset!
    fakeNow += 31_000;
    const r6 = limiter.check(key, limit, windowMs);
    expect(r6.allowed).toBe(true);
    expect(r6.remaining).toBe(2);
  });
});

describe("Rate Limiter - Client IP Derivation & Anti-Spoofing", () => {
  it("prioritizes platform-trusted x-vercel-forwarded-for over spoofed x-forwarded-for", () => {
    const req = new NextRequest("http://localhost:3000/api/ai/ask", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.195",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
        "x-real-ip": "198.51.100.2"
      }
    });

    const ip = getClientIp(req);
    expect(ip).toBe("203.0.113.195");
  });

  it("falls back to x-real-ip when platform header is not set", () => {
    const req = new NextRequest("http://localhost:3000/api/search", {
      headers: {
        "x-real-ip": "198.51.100.2"
      }
    });

    const ip = getClientIp(req);
    expect(ip).toBe("198.51.100.2");
  });

  it("handles x-forwarded-for gracefully when platform headers are absent", () => {
    const req = new NextRequest("http://localhost:3000/api/search", {
      headers: {
        "x-forwarded-for": "192.0.2.1, 10.0.0.1"
      }
    });

    const ip = getClientIp(req);
    expect(ip).toBe("192.0.2.1");
  });
});

describe("Rate Limiter - Headers and Route Enforcement", () => {
  it("generates 429 response with Retry-After, X-RateLimit-Limit, and X-RateLimit-Remaining", async () => {
    const req = new NextRequest("http://localhost:3000/api/github/import", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.50"
      }
    });

    const limit = ROUTE_CLASS_LIMITS.ingest.limit; // 15
    for (let i = 0; i < limit; i++) {
      const check = await enforceRateLimit(req, "ingest", "test-batch");
      expect(check.allowed).toBe(true);
    }

    // 16th request must be blocked
    const blockedCheck = await enforceRateLimit(req, "ingest", "test-batch");
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.response).toBeDefined();

    const res = blockedCheck.response!;
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Limit")).toBe(String(limit));
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("buildRateLimitHeaders formats standard headers correctly", () => {
    const headers = buildRateLimitHeaders({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetInSeconds: 45
    });

    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Retry-After"]).toBe("45");
    expect(Number(headers["X-RateLimit-Reset"])).toBeGreaterThan(0);
  });
});

describe("Rate Limiter - Provider Selection & Fallback", () => {
  it("defaults to in-memory provider when Upstash credentials are not provided", () => {
    const composite = new CompositeRateLimiter({
      redisUrl: undefined,
      redisToken: undefined
    });
    expect(composite.activeProvider).toBe("in-memory");
    expect(composite.upstash).toBeNull();
  });

  it("selects upstash provider when credentials are provided", () => {
    const composite = new CompositeRateLimiter({
      redisUrl: "https://fake-upstash-redis.upstash.io",
      redisToken: "fake-token"
    });
    expect(composite.activeProvider).toBe("upstash");
    expect(composite.upstash).toBeDefined();
  });
});

describe("Rate Limiter - Payload Size Caps", () => {
  it("rejects oversized request bodies with HTTP 413 Payload Too Large", () => {
    const req = new NextRequest("http://localhost:3000/api/ai/ask", {
      method: "POST",
      headers: {
        "content-length": "70000" // 70 KB > 64 KB cap
      }
    });

    const res = checkPayloadSize(req, 65536);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(413);
  });

  it("allows valid request bodies under 64 KB", () => {
    const req = new NextRequest("http://localhost:3000/api/ai/ask", {
      method: "POST",
      headers: {
        "content-length": "2048" // 2 KB
      }
    });

    const res = checkPayloadSize(req, 65536);
    expect(res).toBeNull();
  });
});
