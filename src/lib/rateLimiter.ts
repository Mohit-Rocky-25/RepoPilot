import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();

  /**
   * Check if a client IP is allowed under the rate limit.
   * @param key Client IP or identifier
   * @param maxRequests Maximum requests allowed within window
   * @param windowMs Window duration in milliseconds (default: 60,000ms / 1 min)
   */
  check(
    key: string,
    maxRequests: number = 60,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();

    // Periodic cleanup of expired records every 2 minutes
    if (now - this.lastCleanup > 120000) {
      this.cleanup(now);
    }

    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      // First request or window expired
      this.records.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetInSeconds: Math.ceil(windowMs / 1000)
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.ceil((record.resetAt - now) / 1000)
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000)
    };
  }

  private cleanup(now: number) {
    this.lastCleanup = now;
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(key);
      }
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();

/**
 * Extracts client IP from Next.js request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "anonymous-client";
}
