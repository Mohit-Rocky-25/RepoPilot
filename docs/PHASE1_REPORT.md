# Phase 1 Report: AI Works on Public Deployment

**Commit:** `d08dfcc` — `phase1: add ModelProvider abstraction, BYO-key provider, SSRF DNS validation, and capabilities endpoint`  
**Date:** October 2026  
**Status:** Completed & Verified  

---

## 1. Issues Checked & Verdicts with Evidence

| Issue | Verdict | Implementation Evidence |
| :--- | :---: | :--- |
| **Ollama Unreachable on Vercel** | **RESOLVED** | Created `OpenAICompatibleProvider` and `createModelProvider` factory in `packages/ai`. Enabled BYO API key support so users on public Vercel can bring their own key from any OpenAI-compatible provider. |
| **API Key Storage Security** | **RESOLVED** | User-entered API keys are stored **strictly in browser `sessionStorage`** (`src/app/settings/ai/page.tsx`). Key is cleared when tab closes, injected per-request via `x-ai-key` header in `src/lib/api.ts`, never stored on disk, never persisted server-side, and redacted from error messages with `redactSecret()`. |
| **SSRF DNS Pre-Resolution** | **RESOLVED** | Implemented `validateAiEndpoint()` in `src/lib/security.ts`. Resolves hostnames via `dns.promises.lookup` to prevent DNS-rebinding attacks pointing to `169.254.169.254`, loopback, or private subnets. Enforces HTTPS for all remote endpoints. |
| **Dynamic Capabilities Discovery** | **RESOLVED** | Added `GET /api/ai/capabilities` route returning live readiness of `ollama`, `openai-compatible`, and `offline` modes. |
| **UI Transparency & Mode Badges** | **RESOLVED** | Display standardized badges: `AI: Local Ollama`, `AI: Your API key`, and `AI: Offline (deterministic only)` with clear one-line explanations in `/assistant` and `/settings/ai`. |

---

## 2. Files Changed

* `packages/ai/src/modelProvider.ts`: `ModelProvider` interface, `ProviderConfig`, and `redactSecret()` helper.
* `packages/ai/src/providers/ollamaProvider.ts`: Local Ollama integration.
* `packages/ai/src/providers/openaiCompatibleProvider.ts`: BYO-key OpenAI-compatible provider with timeout and secret redaction.
* `packages/ai/src/providers/offlineProvider.ts`: Offline deterministic fallback provider.
* `packages/ai/src/index.ts`: Exported providers and `createModelProvider()` factory.
* `src/lib/security.ts`: Enhanced SSRF validator with DNS resolution and private IPv4/IPv6/decimal IP checks.
* `src/lib/svgSanitizer.ts`: Client-safe SVG sanitizer isolating DOMParser from Node.js dependencies.
* `src/lib/api.ts`: Updated `clientFetch` to inject `sessionStorage` BYO-key headers.
* `src/app/api/ai/capabilities/route.ts`: New capabilities route.
* `src/app/api/ai/ask/route.ts`: Integrated `ModelProvider` abstraction and error redaction.
* `src/app/settings/ai/page.tsx`: Full BYO-key provider configuration UI with `sessionStorage` security.
* `src/app/assistant/page.tsx`: Dynamic AI mode badge and clear descriptions.
* `tests/ai/modelProvider.test.ts`: 10 new unit tests for providers, factory, and secret redaction.
* `tests/security/securityControls.test.ts`: Added SSRF IP range and HTTPS enforcement tests.

---

## 3. Tests Added & Suite Status

* **Total Tests:** 56 passed (12 test suites)
* **New Tests:**
  * `tests/ai/modelProvider.test.ts` (10 tests covering factory, redaction, regex characters, offline fallback, error shielding)
  * `tests/security/securityControls.test.ts` (4 new tests for IPv6, decimal IPs, private subnet classification, HTTPS remote check)

---

## 4. Verification Output Tails

### `npm run typecheck`
```text
> repopilot@1.0.0 typecheck
> tsc --noEmit
(Exit code: 0)
```

### `npm test`
```text
 Test Files  12 passed (12)
      Tests  56 passed (56)
   Duration  2.41s
(Exit code: 0)
```

### `npm run build`
```text
Route (app)                              Size     First Load JS
┌ ○ /                                    14.3 kB         109 kB
├ ○ /_not-found                          138 B          87.3 kB
├ ƒ /api/ai/ask                          0 B                0 B
├ ƒ /api/ai/capabilities                 0 B                0 B
├ ƒ /api/ai/status                       0 B                0 B
├ ƒ /api/architecture                    0 B                0 B
├ ƒ /api/debugging/analyze               0 B                0 B
├ ƒ /api/github/file                     0 B                0 B
├ ƒ /api/github/import                   0 B                0 B
├ ƒ /api/github/rate-limit               0 B                0 B
├ ƒ /api/search                          0 B                0 B
├ ○ /architecture                        13.8 kB         108 kB
├ ○ /assistant                           6.94 kB         101 kB
├ ○ /debugging                           6.36 kB         101 kB
├ ○ /docs                                3.67 kB          98 kB
├ ○ /explore                             7.51 kB         102 kB
├ ○ /patches                             5.93 kB         100 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /search                              5.28 kB        99.7 kB
├ ○ /settings                            6.97 kB         101 kB
├ ○ /settings/ai                         7.2 kB          102 kB
└ ○ /sitemap.xml                         0 B                0 B
+ First Load JS shared by all            87.1 kB
(Exit code: 0)
```

---

## 5. Decision Gate for User

* **Question:** Which hosted OpenAI-compatible provider(s) should be recommended in docs?
