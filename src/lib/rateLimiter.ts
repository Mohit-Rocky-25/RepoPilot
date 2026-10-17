import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export interface IRateLimiter {
  check(
    key: string,
    limit?: number,
    windowMs?: number
  ): Promise<RateLimitResult> | RateLimitResult;
}

export type RouteClass = "general" | "ai" | "ingest" | "debug";

export const ROUTE_CLASS_LIMITS: Record<RouteClass, { limit: number; windowMs: number }> = {
  general: { limit: 60, windowMs: 60000 }, // 60 req/min
  ingest: { limit: 15, windowMs: 60000 },  // 15 req/min (tarball & tree downloads)
  ai: { limit: 10, windowMs: 60000 },      // 10 req/min (compute-heavy model generation)
  debug: { limit: 20, windowMs: 60000 }    // 20 req/min (stack-trace analysis & hypotheses)
};

/**
 * Derives client IP securely.
 * On Vercel, x-vercel-forwarded-for cannot be spoofed by the client.
 * Does NOT blindly trust client-controlled x-forwarded-for.
 */
export function getClientIp(req: NextRequest): string {
  // 1. Vercel platform-trusted header (unspoofable on Vercel deployment)
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0].trim();
    if (first) return first;
  }

  // 2. Platform request IP property
  if ((req as any).ip) {
    return (req as any).ip;
  }

  // 3. Platform real-IP header
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // 4. Standard X-Forwarded-For fallback (used in dev/local proxy)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  return "127.0.0.1";
}

/**
 * In-memory sliding-window rate limiter with pluggable clock for deterministic testing.
 * Documented as best-effort on serverless platforms where state resets on cold starts.
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private records = new Map<string, { count: number; resetAt: number }>();
  private lastCleanup: number;
  private clock: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
    this.lastCleanup = clock();
  }

  check(
    key: string,
    limit: number = 60,
    windowMs: number = 60000
  ): RateLimitResult {
    const now = this.clock();

    // Periodic cleanup of expired entries
    if (now - this.lastCleanup > 120000) {
      this.cleanup(now);
    }

    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      this.records.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetInSeconds: Math.ceil(windowMs / 1000)
      };
    }

    if (record.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000))
      };
    }

    record.count += 1;
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.count),
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000))
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

  clear() {
    this.records.clear();
  }
}

/**
 * Upstash Redis Rate Limiter for serverless deployments.
 * Shares rate limits across distributed Vercel lambdas.
 */
export class UpstashRateLimiter implements IRateLimiter {
  private redis: Redis;
  private limiterCache = new Map<string, Ratelimit>();
  private inMemoryFallback: InMemoryRateLimiter;

  constructor(url: string, token: string, fallback: InMemoryRateLimiter) {
    this.redis = new Redis({ url, token });
    this.inMemoryFallback = fallback;
  }

  private getRatelimit(limit: number, windowMs: number): Ratelimit {
    const cacheKey = `${limit}:${windowMs}`;
    let limiter = this.limiterCache.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
        analytics: false,
        prefix: "repopilot:rl"
      });
      this.limiterCache.set(cacheKey, limiter);
    }
    return limiter;
  }

  async check(
    key: string,
    limit: number = 60,
    windowMs: number = 60000
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.getRatelimit(limit, windowMs);
      const res = await limiter.limit(key);
      const now = Date.now();
      const resetInSeconds = Math.max(1, Math.ceil((res.reset - now) / 1000));

      return {
        allowed: res.success,
        limit,
        remaining: res.remaining,
        resetInSeconds
      };
    } catch (err) {
      // Gracefully fall back to in-memory if Redis connection fails
      return this.inMemoryFallback.check(key, limit, windowMs);
    }
  }
}

/**
 * Composite rate limiter that automatically uses Upstash Redis when configured,
 * or gracefully falls back to in-memory best-effort limiter.
 */
export class CompositeRateLimiter implements IRateLimiter {
  public readonly inMemory: InMemoryRateLimiter;
  public readonly upstash: UpstashRateLimiter | null = null;
  public readonly activeProvider: "upstash" | "in-memory";

  constructor(options?: {
    clock?: () => number;
    redisUrl?: string;
    redisToken?: string;
  }) {
    this.inMemory = new InMemoryRateLimiter(options?.clock);

    const url =
      options?.redisUrl ||
      (typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_URL : undefined);
    const token =
      options?.redisToken ||
      (typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_TOKEN : undefined);

    if (url && token) {
      this.upstash = new UpstashRateLimiter(url, token, this.inMemory);
      this.activeProvider = "upstash";
    } else {
      this.activeProvider = "in-memory";
    }
  }

  check(
    key: string,
    limit: number = 60,
    windowMs: number = 60000
  ): RateLimitResult & PromiseLike<RateLimitResult> {
    // If Upstash is configured, check asynchronously
    if (this.upstash) {
      const asyncPromise = this.upstash.check(key, limit, windowMs);
      // Return a thenable with optimistic sync fallback properties
      const syncEstimate = this.inMemory.check(key, limit, windowMs);
      return Object.assign(asyncPromise, {
        allowed: syncEstimate.allowed,
        limit: syncEstimate.limit,
        remaining: syncEstimate.remaining,
        resetInSeconds: syncEstimate.resetInSeconds
      });
    }

    // In-memory returns immediate synchronous thenable
    const syncRes = this.inMemory.check(key, limit, windowMs);
    return Object.assign(Promise.resolve(syncRes), syncRes);
  }
}

// Global default rate limiter singleton
export const rateLimiter = new CompositeRateLimiter();

/**
 * Builds standard RFC / GitHub rate limit headers
 */
export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetTimestamp = Math.floor(Date.now() / 1000) + result.resetInSeconds;
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(resetTimestamp),
    ...(result.allowed ? {} : { "Retry-After": String(result.resetInSeconds) })
  };
}

/**
 * Enforces route rate limit with standardized 429 response and headers
 */
export async function enforceRateLimit(
  req: NextRequest,
  routeClass: RouteClass = "general",
  customKeySuffix?: string
): Promise<{ allowed: boolean; result: RateLimitResult; response?: NextResponse }> {
  const clientIp = getClientIp(req);
  const cfg = ROUTE_CLASS_LIMITS[routeClass] || ROUTE_CLASS_LIMITS.general;
  const key = `rl:${routeClass}:${clientIp}${customKeySuffix ? `:${customKeySuffix}` : ""}`;

  const result = await rateLimiter.check(key, cfg.limit, cfg.windowMs);

  if (!result.allowed) {
    const headers = buildRateLimitHeaders(result);
    const response = NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${result.resetInSeconds} seconds.`,
        code: "RATE_LIMITED",
        retryAfter: result.resetInSeconds
      },
      {
        status: 429,
        headers
      }
    );
    return { allowed: false, result, response };
  }

  return { allowed: true, result };
}

/**
 * DoS Defense: Enforces maximum request body size (default: 64 KB).
 * Returns 413 Payload Too Large if Content-Length exceeds maxBytes.
 */
export function checkPayloadSize(
  req: NextRequest,
  maxBytes: number = 65536
): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      {
        error: `Request payload exceeds maximum allowed size (${Math.round(maxBytes / 1024)} KB).`,
        code: "PAYLOAD_TOO_LARGE"
      },
      { status: 413 }
    );
  }
  return null;
}
