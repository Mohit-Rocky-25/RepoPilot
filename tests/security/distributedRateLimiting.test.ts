import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  CompositeRateLimiter,
  STRICT_FALLBACK_LIMITS,
  ROUTE_CLASS_LIMITS,
  enforceRateLimit
} from "../../src/lib/rateLimiter";

describe("Task 4: Distributed Rate Limiting & Production Fallback", () => {
  describe("Separate Rate Limiting Buckets", () => {
    it("enforces ingestion bucket limit (expensive archive/tree operations)", async () => {
      const req = new NextRequest("http://localhost:3000/api/github/import", {
        headers: { "x-vercel-forwarded-for": "198.51.100.11" }
      });

      const limit = ROUTE_CLASS_LIMITS.ingest.limit; // 15
      for (let i = 0; i < limit; i++) {
        const check = await enforceRateLimit(req, "ingest", "test-bucket-ingest");
        expect(check.allowed).toBe(true);
      }

      // Request exceeding bucket limit
      const blocked = await enforceRateLimit(req, "ingest", "test-bucket-ingest");
      expect(blocked.allowed).toBe(false);
      expect(blocked.response?.status).toBe(429);
      expect(blocked.response?.headers.get("Retry-After")).toBeDefined();
    });

    it("enforces assistant calls bucket limit (ai model generation)", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/ask", {
        headers: { "x-vercel-forwarded-for": "198.51.100.12" }
      });

      const limit = ROUTE_CLASS_LIMITS.ai.limit; // 10
      for (let i = 0; i < limit; i++) {
        const check = await enforceRateLimit(req, "ai", "test-bucket-ai");
        expect(check.allowed).toBe(true);
      }

      const blocked = await enforceRateLimit(req, "ai", "test-bucket-ai");
      expect(blocked.allowed).toBe(false);
      expect(blocked.response?.status).toBe(429);
      expect(blocked.response?.headers.get("Retry-After")).toBeDefined();
    });

    it("enforces debugging bucket limit (stack trace and hypothesis engine)", async () => {
      const req = new NextRequest("http://localhost:3000/api/debugging/analyze", {
        headers: { "x-vercel-forwarded-for": "198.51.100.13" }
      });

      const limit = ROUTE_CLASS_LIMITS.debug.limit; // 20
      for (let i = 0; i < limit; i++) {
        const check = await enforceRateLimit(req, "debug", "test-bucket-debug");
        expect(check.allowed).toBe(true);
      }

      const blocked = await enforceRateLimit(req, "debug", "test-bucket-debug");
      expect(blocked.allowed).toBe(false);
      expect(blocked.response?.status).toBe(429);
      expect(blocked.response?.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("Production Upstash Absence Fallback Behavior", () => {
    it("logs a loud warning and activates strict in-memory limits when Upstash env vars are missing in production", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const limiter = new CompositeRateLimiter({
        redisUrl: undefined,
        redisToken: undefined,
        nodeEnv: "production"
      });

      expect(limiter.activeProvider).toBe("in-memory");
      expect(limiter.isStrictFallbackActive).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("SECURITY WARNING")
      );

      warnSpy.mockRestore();
    });

    it("applies stricter limits for all buckets when strict fallback is active", () => {
      expect(STRICT_FALLBACK_LIMITS.ingest.limit).toBeLessThan(ROUTE_CLASS_LIMITS.ingest.limit);
      expect(STRICT_FALLBACK_LIMITS.ai.limit).toBeLessThan(ROUTE_CLASS_LIMITS.ai.limit);
      expect(STRICT_FALLBACK_LIMITS.debug.limit).toBeLessThan(ROUTE_CLASS_LIMITS.debug.limit);
      expect(STRICT_FALLBACK_LIMITS.general.limit).toBeLessThan(ROUTE_CLASS_LIMITS.general.limit);

      // Verify specific strict thresholds
      expect(STRICT_FALLBACK_LIMITS.ingest.limit).toBe(5);
      expect(STRICT_FALLBACK_LIMITS.ai.limit).toBe(5);
      expect(STRICT_FALLBACK_LIMITS.debug.limit).toBe(10);
    });

    it("does not log security warning or activate strict fallback in non-production environments", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const limiter = new CompositeRateLimiter({
        redisUrl: undefined,
        redisToken: undefined,
        nodeEnv: "development"
      });

      expect(limiter.isStrictFallbackActive).toBe(false);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
