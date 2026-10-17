# RepoPilot: Baseline Audit & Technical Reality Report

**Date:** October 2026  
**Auditor:** Lead Systems & Security Engineer  
**Baseline Test Suite:** 42 passed (11 test suites) across 1,530ms  
**TypeScript Typecheck:** 0 errors (`tsc --noEmit`)  
**Production Build:** Completed with 23/23 static/dynamic routes prerendered  
**Status:** Baseline Phase 0 Audit Complete — No code behavior changes applied.

---

## 1. Technical Audit Matrix (Claims vs. Code Reality)

| README Claim / Feature | Source Implementation File & Lines | Actual Status | Technical Reality & Evidence |
| :--- | :--- | :---: | :--- |
| **Repository Ingestion** | [`packages/github/src/client.ts:199-312`](file:///c:/Users/yadav/Documents/HEXON/packages/github/src/client.ts#L199-L312) | **Partial / Misleading** | Ingests tree, but rate limit header parsing in `client.ts:74-78` artificially inflates unauthenticated limits to `limit: 5000` via `Math.max(5000, parsedLimit)`. Per-blob fetching burns rate limits rapidly. |
| **Code Explorer** | [`src/app/explore/page.tsx:1-120`](file:///c:/Users/yadav/Documents/HEXON/src/app/explore/page.tsx#L1-L120) | **Works** | Dual pane navigation functions, but fetches file content individually per click via `raw.githubusercontent.com` / GitHub API rather than archive streaming. |
| **Deterministic Code Search** | [`packages/search/src/searchEngine.ts:1-95`](file:///c:/Users/yadav/Documents/HEXON/packages/search/src/searchEngine.ts#L1-L95) | **Works** | Purely deterministic client/memory search matching file paths, symbol identifiers, and language filters. |
| **AST Symbol Extraction** | [`packages/indexer/src/symbolExtractor.ts:44-100`](file:///c:/Users/yadav/Documents/HEXON/packages/indexer/src/symbolExtractor.ts#L44-L100) | **Misleading** | **Not an AST.** Uses single-line regular expressions (`funcPattern.exec(trimmed)`). Sets `endLine: idx + 1`, meaning it cannot extract multi-line bodies, arrow function blocks, nested functions, or type hierarchies. |
| **3D Architecture Visualization** | [`src/components/architecture/ArchitectureMap3D.tsx:120-185`](file:///c:/Users/yadav/Documents/HEXON/src/components/architecture/ArchitectureMap3D.tsx#L120-L185) | **Misleading** | README claims "Three.js WebGL canvas". `three` is not in `package.json` dependencies! It is an HTML5 2D canvas with manual trigonometric projection math (`project3D`). |
| **Architecture Evidence Brief** | [`packages/analysis/src/architectureAnalyzer.ts:1-110`](file:///c:/Users/yadav/Documents/HEXON/packages/analysis/src/architectureAnalyzer.ts#L1-L110) | **Works** | Analyzes manifest files (`package.json`, `go.mod`, etc.) to heuristically detect frameworks and directory roles. |
| **Grounded Code Assistant** | [`src/app/api/ai/ask/route.ts:1-90`](file:///c:/Users/yadav/Documents/HEXON/src/app/api/ai/ask/route.ts#L1-L90), [`packages/ai/src/ollamaClient.ts:1-60`](file:///c:/Users/yadav/Documents/HEXON/packages/ai/src/ollamaClient.ts#L1-L60) | **Partial / Broken on Deploy** | Hardcoded to target local Ollama on `localhost:11434`. On Vercel serverless deployments, `localhost` is unreachable, forcing public users into the offline fallback 100% of the time. No BYO-key option. |
| **Citation Verification** | [`packages/ai/src/citationValidator.ts:34-66`](file:///c:/Users/yadav/Documents/HEXON/packages/ai/src/citationValidator.ts#L34-L66) | **Partial** | Only checks if `filePath` exists in `RepositoryFile[]` and `startLine >= 1`. Does NOT verify that the file actually contains that many lines, nor does it verify that cited symbols appear in the range. |
| **Bug & Stack Trace Analyzer** | [`packages/debugging/src/stackTraceParser.ts:1-120`](file:///c:/Users/yadav/Documents/HEXON/packages/debugging/src/stackTraceParser.ts#L1-L120) | **Works** | Parses Node/V8 and Python stack traces into structured frames and filters vendor frames. |
| **Patch Review & PR Export** | [`packages/debugging/src/hypothesisEngine.ts:95-102`](file:///c:/Users/yadav/Documents/HEXON/packages/debugging/src/hypothesisEngine.ts#L95-L102) | **Misleading** | "Candidate diff" is a hardcoded JavaScript null guard template string (`if (!target || typeof target !== "object") return undefined;`) emitted for all languages (Python, Go, Rust, etc.). |
| **Rate Limit Management** | [`src/app/settings/page.tsx:47-56`](file:///c:/Users/yadav/Documents/HEXON/src/app/settings/page.tsx#L47-L56), [`src/lib/rateLimiter.ts:8-86`](file:///c:/Users/yadav/Documents/HEXON/src/lib/rateLimiter.ts#L8-L86) | **Misleading & Security Risk** | PAT is stored in `localStorage` (`REPOPILOT_GH_TOKEN`), vulnerable to XSS exfiltration. In-memory limiter resets on serverless cold starts. `getClientIp()` trusts spoofable `x-forwarded-for`. |
| **SSRF Protection** | [`src/lib/security.ts:69-140`](file:///c:/Users/yadav/Documents/HEXON/src/lib/security.ts#L69-L140) | **Works (Local scope)** | Blocks cloud metadata (`169.254.169.254`) and RFC1918 subnets, but lacks DNS pre-resolution for hosted domain names and redirect re-validation. |
| **Content Security Policy (CSP)** | [`next.config.mjs:15-32`](file:///c:/Users/yadav/Documents/HEXON/next.config.mjs#L15-L32) | **Works** | Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, and CSP, though CSP uses `'unsafe-inline'` for styles and scripts. |
| **SVG XSS Sanitization** | [`src/components/architecture/MermaidViewer.tsx:12-40`](file:///c:/Users/yadav/Documents/HEXON/src/components/architecture/MermaidViewer.tsx#L12-L40), [`src/lib/security.ts:142-156`](file:///c:/Users/yadav/Documents/HEXON/src/lib/security.ts#L142-L156) | **Works** | Uses DOMParser to strip `<script>`, `<foreignObject>`, inline `onload` attributes, and `javascript:` URIs. |

---

## 2. Environment Variables Audit

| Environment Variable | Where Read | Default Value | Usage & Real Purpose |
| :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` | [`packages/github/src/client.ts:26`](file:///c:/Users/yadav/Documents/HEXON/packages/github/src/client.ts#L26), route handlers | `undefined` | Optional server-side PAT to increase GitHub REST quota from 60 to 5,000 req/hr. |
| `NEXT_PUBLIC_SITE_URL` | [`src/app/layout.tsx:7`](file:///c:/Users/yadav/Documents/HEXON/src/app/layout.tsx#L7), `sitemap.ts`, `robots.ts` | `"https://repopilot.dev"` | Base URL used for Open Graph, canonical links, and sitemaps. |
| `PORT` | Documented in `README.md:224` | `3000` | Read by Next.js CLI runtime. |
| `OLLAMA_BASE_URL` | Documented in `.env.example:8` and `README.md:228` | **NOT READ IN CODE** | **Audit Finding:** Documented in README/DEPLOYMENT, but never actually read from `process.env` in code. Hardcoded fallback in `api/ai/status/route.ts:19` is `"http://localhost:11434"`. |
| `DEFAULT_AI_MODEL` / `DEFAULT_MODEL` | Documented in `.env.example:11` and `README.md:229` | **NOT READ IN CODE** | **Audit Finding:** Documented in README, but never read from `process.env`. Hardcoded in `src/app/api/ai/ask/route.ts:37` to `"qwen2.5-coder:1.5b"`. |

---

## 3. Production Bundle Size Baseline

Produced from `next build` on Node.js v22 LTS:

### Top 10 Largest Client Bundles:
1. `chunks/fd9d1056-052469a1d6664a2a.js`: **172.8 kB** (Shared React DOM & core framework)
2. `chunks/framework-f66176bb897dc684.js`: **140.0 kB** (Next.js client runtime)
3. `chunks/117-617886599c5b3ae2.js`: **123.5 kB** (Shared utilities & icons)
4. `chunks/polyfills-42372ed130431b0a.js`: **112.6 kB** (Polyfills)
5. `chunks/main-d9d36c7a02bde382.js`: **111.6 kB** (Main application entry)
6. `chunks/946-b99d8d0aa192a769.js`: **64.2 kB** (Shared UI components)
7. `chunks/app/page-dce877f7bc026fcd.js`: **63.0 kB** (Homepage client bundle)
8. `chunks/app/architecture/page-43f45fa3baa91e64.js`: **49.1 kB** (Architecture 2D/3D map component)
9. `chunks/app/layout-80de24aa729825a9.js`: **30.4 kB** (Root layout & navigation)
10. `chunks/app/explore/page-a3da8097bf2c6f05.js`: **24.1 kB** (Code Explorer dual-pane)

### Total First Load JS by Route:
* **Home (`/`):** 109 kB
* **Architecture (`/architecture`):** 108 kB
* **Explorer (`/explore`):** 102 kB
* **AI Assistant (`/assistant`):** 101 kB
* **Debugging (`/debugging`):** 101 kB
* **Patches (`/patches`):** 100 kB
* **Search (`/search`):** 99.5 kB
* **Docs (`/docs`):** 98 kB
* **Shared Base JS:** 87.1 kB

---

## 4. Verification of the 11 Known Problems

| ID | Issue Description | Verdict | Evidence |
| :--- | :--- | :---: | :--- |
| **1** | AI layer targets local Ollama, unreachable from Vercel serverless deploy | **CONFIRMED** | `src/app/api/ai/ask/route.ts` & `status/route.ts` query `localhost:11434` from serverless functions. Visitors on Vercel only get offline fallback. |
| **2** | GitHub REST 60 req/hr burned by per-blob fetching; PAT stored in `localStorage` | **CONFIRMED** | `packages/github/src/client.ts:327` fetches raw blobs per file. `src/lib/api.ts:11` reads PAT from `localStorage.getItem("REPOPILOT_GH_TOKEN")`. |
| **3** | "AST symbol extraction" is regex pattern matching, not a real AST | **CONFIRMED** | `packages/indexer/src/symbolExtractor.ts:46-50` uses single-line regex patterns with `endLine = startLine`. |
| **4** | In-memory rate limiting resets on serverless cold starts; client IP trusts spoofed headers | **CONFIRMED** | `src/lib/rateLimiter.ts:8` uses in-memory `Map`. `getClientIp()` takes the first IP from `x-forwarded-for` directly without verification. |
| **5** | Default model `qwen2.5-coder:1.5b` too small; citation check only checks file existence | **CONFIRMED** | Model is hardcoded to 1.5b. `packages/ai/src/citationValidator.ts:44-65` checks `fileMap.get(cit.filePath)` but never validates line count or symbol presence. |
| **6** | Candidate diffs without AI are hardcoded templates | **CONFIRMED** | `packages/debugging/src/hypothesisEngine.ts:95-102` emits `if (!target || typeof target !== "object") return undefined;` for every single language and error. |
| **7** | README has unsourced "70%" claim, Pinecone strawman, and claims "Verified / Active" on everything | **CONFIRMED** | `README.md:51` ("70%"), `README.md:172` (cost table compares to Pinecone vector DB which app doesn't use), `README.md:63` claims "Verified" on regex AST and templated diffs. |
| **8** | 3D architecture map claims Three.js but is custom Canvas 2D math | **CONFIRMED** | `README.md:191` claims Three.js. `package.json` does not have `three`. `src/components/architecture/ArchitectureMap3D.tsx` uses custom Canvas 2D projection. |
| **9** | No evaluation harness measuring retrieval or citation accuracy | **CONFIRMED** | No `eval/` folder, no precision/recall metrics, no test queries. |
| **10** | PDF scripts have non-renderable emoji in Helvetica, hardcoded paths, unguarded file copy | **CONFIRMED** | `generate_readme_pdf.js` uses emoji (🌐, 📂, ⚡) with Helvetica, hardcodes `C:\Users\yadav...`, and copies files without directory existence guards. |
| **11** | Naming collision with other "RepoPilot" projects | **CONFIRMED** | At least five GitHub repos use the name "RepoPilot". |
