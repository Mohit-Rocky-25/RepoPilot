# Phase 4 Report: Serverless Rate Limiting & Anti-Spoofing

## 1. Issues Checked & Verdicts

| Item | Problem / Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Client IP derivation trusting spoofable headers | **CONFIRMED & FIXED** | Previous `getClientIp()` in `src/lib/rateLimiter.ts` read client-supplied `x-forwarded-for` directly without verification. Now prioritizes platform-trusted `x-vercel-forwarded-for` (unspoofable on Vercel), `req.ip`, and `x-real-ip`. |
| 2 | Limiter behind interface with Upstash Redis | **RESOLVED** | Defined `IRateLimiter` interface. Implemented `UpstashRateLimiter` using `@upstash/ratelimit` + `@upstash/redis`, enabled when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, with graceful fallback to `InMemoryRateLimiter`. |
| 3 | Per-route-class limits & body size caps | **RESOLVED** | Implemented `ROUTE_CLASS_LIMITS`: `general` (60 req/min), `ingest` (15 req/min), `ai` (10 req/min), `debug` (20 req/min). Added `checkPayloadSize()` enforcing 64 KB cap on `/api/ai/ask` and `/api/debugging/analyze` (HTTP 413). |
| 4 | Standard 429 response headers | **RESOLVED** | All 429 responses emit `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0`, and `X-RateLimit-Reset` timestamp. |
| 5 | Tests with fake clock, headers, and fallback | **RESOLVED** | Created `tests/security/rateLimiter.test.ts` (10 unit tests) verifying fake-clock sliding-window reset, spoofing rejection, provider fallback, and body size limits. |

---

## 2. Files Changed

- `.env.example`: Documented `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as optional serverless rate-limiting settings.
- `package.json` & `package-lock.json`: Added `@upstash/ratelimit` and `@upstash/redis`.
- `src/lib/rateLimiter.ts`: Complete rewrite implementing `IRateLimiter`, `InMemoryRateLimiter` (with injectable clock), `UpstashRateLimiter`, `CompositeRateLimiter`, `enforceRateLimit()`, `checkPayloadSize()`, and `buildRateLimitHeaders()`.
- `src/app/api/github/import/route.ts`: Switched to `enforceRateLimit(req, "ingest")` (15 req/min).
- `src/app/api/ai/ask/route.ts`: Added 64 KB payload cap (`checkPayloadSize`) and `enforceRateLimit(req, "ai")` (10 req/min).
- `src/app/api/debugging/analyze/route.ts`: Added 64 KB payload cap and `enforceRateLimit(req, "debug")` (20 req/min).
- `src/app/api/search/route.ts`: Switched to `enforceRateLimit(req, "general")` (60 req/min).
- `src/app/api/architecture/route.ts`: Switched to `enforceRateLimit(req, "general")` (60 req/min).
- `src/app/api/github/file/route.ts`: Switched to `enforceRateLimit(req, "general")` (60 req/min).
- `src/app/api/github/rate-limit/route.ts`: Switched to `enforceRateLimit(req, "general")` (60 req/min).
- `tests/security/rateLimiter.test.ts`: 10 comprehensive tests.

---

## 3. Tests Added

- `Rate Limiter - InMemory with Fake Clock`:
  - Enforces sliding-window limit, counts down remaining quota, blocks when exceeded, and resets when clock advances past window.
- `Rate Limiter - Client IP Derivation & Anti-Spoofing`:
  - Prioritizes platform-trusted `x-vercel-forwarded-for` over spoofed `x-forwarded-for`.
  - Fallback order: `x-vercel-forwarded-for` -> `req.ip` -> `x-real-ip` -> `x-forwarded-for` -> `127.0.0.1`.
- `Rate Limiter - Headers and Route Enforcement`:
  - Emits 429 status code with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining: 0`.
  - `buildRateLimitHeaders` outputs correct Unix reset timestamp.
- `Rate Limiter - Provider Selection & Fallback`:
  - Automatically selects `in-memory` when Upstash credentials are absent.
  - Automatically activates `upstash` when Upstash credentials are provided.
- `Rate Limiter - Payload Size Caps`:
  - Rejects request bodies > 64 KB with HTTP 413 Payload Too Large.
  - Allows valid request bodies <= 64 KB.

---

## 4. Verification Gate Output

```bash
# Typecheck
npm run typecheck
> repopilot@1.0.0 typecheck
> tsc --noEmit
# Exit code: 0

# Test Suite
npm test
> repopilot@1.0.0 test
> vitest run
 Test Files  14 passed (14)
      Tests  79 passed (79)
   Duration  3.03s
# Exit code: 0

# Production Build
npm run build
> repopilot@1.0.0 build
> next build
 ✓ Compiled successfully
 ✓ Generating static pages (24/24)
Route (app)                              Size     First Load JS
┌ ○ /                                    14.3 kB         109 kB
+ First Load JS shared by all            87.3 kB
# Exit code: 0
```
