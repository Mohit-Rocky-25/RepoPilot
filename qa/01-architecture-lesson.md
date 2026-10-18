# QA Report 01: RepoPilot Architecture Teacher & Code Map

**Target File:** `qa/01-architecture-lesson.md`  
**Branch:** `qa/prelaunch`  
**Execution Time:** October 2026  
**Auditor:** QA Engineer & Educator  

---

## 1. Monorepo Package Map (Verified by Reading Entry Files)

Rather than trusting documentation, each package was audited directly from its TypeScript source code and export declarations:

| Package Identifier | Real Source Location | Core Exports & Real Responsibilities |
| :--- | :--- | :--- |
| **`@repopilot/core`** | [`packages/core/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/core/src/index.ts) | Defines all Zod validation schemas (`RepositoryFileSchema`, `SearchQuerySchema`, `CitationSchema`, etc.) and canonical TypeScript interfaces shared across all subsystems. It provides the single source of truth for repository data contracts. |
| **`@repopilot/github`** | [`packages/github/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/github/src/index.ts) | Handles GitHub REST communication (`GitHubClient`), URL parsing (`parseGitHubUrl`), memory caching (`RepoCache`), single-tarball archive streaming (`fetchAndExtractTarball`), and rate-limit accounting. |
| **`@repopilot/indexer`** | [`packages/indexer/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/indexer/src/index.ts) | Extracts structural programming symbols. Features dual-mode parsing: WebAssembly Tree-sitter AST extraction (`treeSitterParser.ts`) with multi-line span tracking for TS, JS, Python, Go, and Rust, with bounded regex heuristic fallback (`symbolExtractor.ts`). |
| **`@repopilot/search`** | [`packages/search/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/search/src/index.ts) | Client-side deterministic lexical search engine (`SearchEngine`). Implements BM25 context retrieval, symbol boosting, language filtering, and exact line-level snippet extraction with 0 cloud dependencies. |
| **`@repopilot/analysis`** | [`packages/analysis/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/analysis/src/index.ts) | Repository framework detector, directory role classifier, entry-point discoverer, and 2D/3D architecture graph generator (`ArchitectureAnalyzer`). Resolves import statements into directional dependency edges. |
| **`@repopilot/ai`** | [`packages/ai/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/ai/src/index.ts) | Provider-agnostic AI layer. Exports `createModelProvider`, `OllamaProvider`, `OpenAICompatibleProvider`, `OfflineProvider`, prompt builder with prompt-injection defense (`PromptBuilder`), and two-pass strict citation validator (`CitationValidator`). |
| **`@repopilot/debugging`** | [`packages/debugging/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/debugging/src/index.ts) | Error investigation engine. Exports `StackTraceParser` (multi-language frame parsing and vendor filtering), `HypothesisEngine` (syntax-aware unified PR diff drafting), and `DiffValidator`. |
| **`@repopilot/execution`** | [`packages/execution/src/index.ts`](file:///c:/Users/yadav/Documents/HEXON/packages/execution/src/index.ts) | Sandboxed execution policy framework (`executionPolicy.ts`) specifying what commands and file modifications are permitted or prohibited. |

---

## 2. End-to-End User Journey Trace

Here is the exact code trace of what happens when a developer uses RepoPilot:

```text
[User Pastes GitHub URL]
         │
         ▼
1. src/app/page.tsx: handleSubmit()
   - Calls clientFetch("/api/github/import", { url })
         │
         ▼
2. src/app/api/github/import/route.ts
   - Validates input with ImportRequestSchema (Zod)
   - Checks rate limit: enforceRateLimit(req, "ingest")
   - Calls parseGitHubUrl() -> extracts { owner, repo }
   - Calls GitHubClient.resolveRevision() -> resolves HEAD to immutable commit SHA (e.g. 5d80486f)
   - Calls GitHubClient.fetchTree() -> streams .tar.gz archive into memory via tarballExtractor.ts
   - Returns { repository, revision, tree, rateLimit }
         │
         ▼
3. src/context/RepositoryContext.tsx
   - Stores tree, metadata, and revision in React Context
   - Caches files in client-side memory
         │
         ▼
4. packages/indexer/src/symbolExtractor.ts
   - Parses code files using WebAssembly Tree-sitter
   - Maps functions, classes, interfaces to startLine / endLine coordinates
         │
         ▼
5. src/app/search/page.tsx & SearchModal.tsx
   - Calls SearchEngine.search(query) from @repopilot/search
   - Matches path fragments, symbol names, and lexical text with BM25 ranking
         │
         ▼
6. src/app/assistant/page.tsx
   - Posts to /api/ai/ask with user question
   - SearchEngine.retrieveContext() isolates relevant files within token bounds
   - createModelProvider() queries local Ollama or BYO cloud key
   - CitationValidator.validate() verifies cited file paths, line ranges, and symbols
   - Displays answer with clickable citation chips
         │
         ▼
7. src/app/debugging/page.tsx
   - Posts runtime crash log to /api/debugging/analyze
   - StackTraceParser.parse() extracts structured frames and strips vendor frames
   - HypothesisEngine.formulateHypotheses() generates candidate unified diff
   - Renders reproducible patch and markdown PR draft
```

---

## 3. Complete API Routes Specification

All 9 serverless API routes implement IP rate limiting, input validation, and sanitized error disclosures:

| Route & Method | Request Input Schema | Output Response Shape | Error Handling |
| :--- | :--- | :--- | :--- |
| **`POST /api/github/import`** | `{ url: string (1-256 chars) }` | `{ success: true, repository, revision, tree, rateLimit }` | `400` on invalid URL or traversal; `429` on rate limit. |
| **`GET /api/github/file`** | Query: `?owner&repo&sha&path` | `{ success: true, path, content, size, language, isBinary }` | `400` on path traversal or missing params; `404` if absent. |
| **`GET /api/github/rate-limit`**| Query: `?hasUserToken` | `{ success: true, rateLimit: { remaining, limit, reset } }` | `500` if upstream GitHub rate limit check fails. |
| **`POST /api/search`** | `{ owner, repo, sha, query, type?, language?, pathPrefix? }` | `{ success: true, results: SearchResult[], stats }` | `400` on traversal in `pathPrefix` or bad repo format. |
| **`POST /api/architecture`** | `{ owner, repo, sha }` | `{ success: true, summary: ArchitectureSummary, graph: ArchitectureGraph, rateLimit }` | `400` on bad SHA; `500` on analysis failure. |
| **`POST /api/ai/ask`** | `{ owner, repo, sha, question, targetFilePath?, baseUrl?, model?, maxContextTokens? }`, Headers: `x-ai-key`, `x-ai-provider` | `{ success: true, answer: string, citations: SourceReference[], confidence, modelUsed, qualityWarning }` | `400` on empty query; switches to deterministic mode if provider is offline. |
| **`GET /api/ai/status`** | Query: `?ollamaUrl` | `{ available: boolean, models: string[], currentModel, error? }` | `429` on polling abuse; returns `available: false` with reason. |
| **`GET /api/ai/capabilities`** | Query: `?ollamaUrl`, Headers: `x-ai-key`, `x-ai-base-url` | `{ ollama: { available, models }, custom: { available }, recommendedProvider, availableProviders }` | `429` on rate limit; reports live status of local & cloud providers. |
| **`POST /api/debugging/analyze`** | `{ owner, repo, sha, title, description, stackTrace }`, Headers: `x-ai-key`, `x-ai-provider` | `{ success: true, parsedTrace, hypotheses: Hypothesis[], candidatePatch, prDraft, limitations }` | `413` if payload > 64KB; `400` on empty stack trace. |

---

## 4. Environment Variables & Defaults

| Variable Name | Required? | Default Value in Code | Purpose & Security Note |
| :--- | :---: | :--- | :--- |
| `GITHUB_TOKEN` | Optional | `undefined` (Anonymous 60 req/hr) | Raises upstream GitHub REST API quota to 5,000 req/hr. Kept strictly server-side. |
| `NEXT_PUBLIC_SITE_URL` | Optional | `"https://repopilot.dev"` | Base URL used for OpenGraph cards, sitemaps, and canonical SEO tags. |
| `OLLAMA_BASE_URL` | Optional | `"http://localhost:11434"` | URL for local or tunneled Ollama daemon. |
| `DEFAULT_MODEL` | Optional | `"qwen2.5-coder:7b"` | Default open-source coding model requested from Ollama. |
| `MAX_CONTEXT_TOKENS` | Optional | `"4000"` | Hard token limit to prevent context window blowouts. |
| `UPSTASH_REDIS_REST_URL`| Optional | `undefined` (In-memory fallback) | REST URL for distributed Upstash Redis rate limiting across serverless instances. |
| `UPSTASH_REDIS_REST_TOKEN`| Optional | `undefined` (In-memory fallback) | Secret token for Upstash Redis cluster. |

---

## 5. User-Visible Features & UI Locations

| User-Visible Feature | Route / Page | Component Source File | What the User Can Do |
| :--- | :--- | :--- | :--- |
| **Homepage Hero Ingest** | `/` | [`src/app/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/page.tsx) | Paste public GitHub URLs, click quick-launch sample pills, view architecture overview. |
| **Precomputed Examples Gallery** | `/examples` | [`src/app/examples/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/examples/page.tsx) | Explore 3 benchmark repos (`vercel/swr`, `pallets/flask`, `gin-gonic/gin`) with 0 API keys and 0 rate limits. |
| **Code Explorer** | `/explore` | [`src/app/explore/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/explore/page.tsx) | Dual-pane file browser with mobile responsive tabs (`Files` vs `Code`) and AST symbol definitions chips. |
| **Deterministic Code Search** | `/search` | [`src/app/search/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/search/page.tsx), [`src/components/modals/SearchModal.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/components/modals/SearchModal.tsx) | Press `Ctrl + K` or `/` to search symbols and code lines with BM25 ranking. |
| **Architecture Brief & Maps** | `/architecture` | [`src/app/architecture/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/architecture/page.tsx), [`ArchitectureMap3D.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/components/architecture/ArchitectureMap3D.tsx) | Inspect framework brief, directory roles, 2D schematic, 3D projection, and high-contrast Mermaid diagrams. |
| **Grounded AI Assistant** | `/assistant` | [`src/app/assistant/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/assistant/page.tsx) | Ask repository questions with verified line-level citations, refusal on lack of evidence, and empty state guides. |
| **Stack Trace Debugger** | `/debugging` | [`src/app/debugging/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/debugging/page.tsx) | Paste runtime crash traces, map frames to source lines, formulate root cause hypotheses. |
| **Patch Review** | `/patches` | [`src/app/patches/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/patches/page.tsx) | Review candidate unified diffs and copy markdown PR export templates. |
| **AI Provider Settings** | `/settings/ai` | [`src/app/settings/ai/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/settings/ai/page.tsx) | Toggle between Local Ollama, BYO Key (Gemini, Groq, OpenAI, Anthropic), or Offline Deterministic Mode. |
| **Token & Rate Limits** | `/settings` | [`src/app/settings/page.tsx`](file:///c:/Users/yadav/Documents/HEXON/src/app/settings/page.tsx) | View GitHub API remaining quota and optionally provide personal access token in ephemeral `sessionStorage`. |

---

## 6. ASCII Data-Flow Diagram

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         Browser Client (Next.js 14)                    │
 │   - / (Home)      - /examples (Gallery)   - /explore (Explorer)        │
 │   - /search       - /architecture (Map)   - /assistant (Grounded AI)   │
 │   - /debugging    - /patches (Diff Review)- /settings/ai (BYO Key)     │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP Fetch (Next.js App Router API)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Security & Rate-Limiting Perimeter                │
 │  - IP Rate Limiting (Upstash Redis REST + Sliding-Window fallback)     │
 │  - SSRF Defense (Blocks 169.254.169.254, RFC1918, IPv4 uint32 parse)   │
 │  - Path Traversal Guard (Multi-pass decoding, null byte check)         │
 │  - 64KB Payload Limit & Error Message Path Scrubbing                   │
 └──────────────────┬─────────────────┬───────────────────┬───────────────┘
                    │                 │                   │
         ┌──────────▼─────────┐ ┌─────▼──────────┐ ┌──────▼─────────────┐
         │ @repopilot/github  │ │@repopilot/ai   │ │@repopilot/debugging│
         │ - Tarball archive  │ │- PromptBuilder │ │- StackTraceParser  │
         │   streaming (.tar) │ │- CitationCheck │ │- HypothesisEngine  │
         │ - SHA pinning      │ │- BYO Cloud Key │ │- Unified PR Diffs  │
         │ - LRU cache        │ │- Local Ollama  │ │                    │
         └──────────┬─────────┘ └─────┬──────────┘ └────────────────────┘
                    │                 │
         ┌──────────▼─────────────────▼──────────┐
         │ @repopilot/indexer & @repopilot/search│
         │ - Tree-sitter WebAssembly AST Parser  │
         │ - BM25 Context Ranker & Symbol Index  │
         │ - Architecture Analyzer & 2D/3D Graph │
         └───────────────────────────────────────┘
```

---

## 7. Technical Glossary

- **AST (Abstract Syntax Tree):** A tree representation of source code structure created by a compiler or parser. Unlike regular expressions, an AST understands syntax rules, nested functions, and multi-line scope blocks.
- **BM25 (Best Matching 25):** A probabilistic ranking function used in search engines to rank documents according to term frequency, document length, and inverse document frequency.
- **BYO Key (Bring Your Own Key):** An architecture pattern where users supply their own cloud API credential (e.g., from OpenAI or Google Gemini). The server never stores the key in a database, keeping cloud costs at zero for the host.
- **Commit SHA:** A 40-character hexadecimal cryptographic hash that uniquely identifies an immutable Git commit snapshot. Pinning to a SHA guarantees line numbers never drift.
- **CORS (Cross-Origin Resource Sharing):** A browser security mechanism that restricts HTTP requests initiated from scripts outside the origin domain.
- **CSP (Content Security Policy):** An HTTP response header that restricts the resources (scripts, styles, images) that the browser is allowed to load.
- **LRU Cache (Least Recently Used):** An in-memory cache eviction policy that removes the least recently accessed items first when memory capacity is reached.
- **SSRF (Server-Side Request Forgery):** A web security vulnerability where an attacker tricks a backend server into making HTTP requests to internal, private, or cloud metadata network addresses.
- **Tarball Streaming:** Downloading and extracting an entire `.tar.gz` archive directly in memory without writing temporary files to the disk.
- **Zod Schema:** A TypeScript-first data validation library that checks object structures at runtime and infers TypeScript types automatically.

---

## 8. What this means (plain language)

### What was tested:
We inspected every single package entry file (`packages/*/src/index.ts`), all 9 API route handlers (`src/app/api/*`), all environment variables, and UI views across the RepoPilot project to build an exact, verified technical blueprint.

### Why it matters:
Testing software is impossible if you only read the marketing copy or assume the code works as advertised. Before running QA tests, you must know:
1. What each component is *actually* responsible for doing.
2. What route handles each user click.
3. Where data enters the system and where it exits.
4. What happens when dependencies (like GitHub or Ollama) fail.

### How to read the result:
The map above proves that RepoPilot is divided into 8 modular packages operating under strict validation contracts. If a bug occurs during ingestion, you immediately know to look in `@repopilot/github` and `/api/github/import`. If a search fails, you know to look in `@repopilot/search` and `SearchEngine.ts`.

### What tools were used:
- **`list_dir` / `view_file`**: Inspected local directory layouts and real TypeScript code.
- **TypeScript strict types & Zod schemas**: Code definitions verified against source contracts.
