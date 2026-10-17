# REPOPILOT SECURITY TEST PLAN & VERIFICATION SPECIFICATION

**Document Version:** 1.0.0  
**Target Application:** RepoPilot (`Mohit-Rocky-25/RepoPilot`)  
**Deployment Surface:** Vercel Edge / Serverless (`https://repo-pilot-git.vercel.app`)  
**Assessment Date:** October 2026  
**Classification:** Confidential — Security Testing Specification  

---

## 1. Scope and Test Objectives

### 1.1 In-Scope Targets
The test plan covers all public interfaces, serverless API routes, utility modules, and rendering components within RepoPilot:

| Target Component | Surface Type | Primary Threat Vectors |
| :--- | :--- | :--- |
| `/api/ai/status` | Serverless API (POST) | SSRF, Internal Port Scanning, DoS |
| `/api/ai/ask` | Serverless API (POST) | SSRF, Prompt Injection, Identifier Injection, Payload Flooding |
| `/api/github/file` | Serverless API (GET) | Path Traversal, Cache Poisoning, Excessive Upstream Usage |
| `/api/github/import` | Serverless API (POST) | Malicious Repo Injection, DoS, Rate Limit Depletion |
| `/api/github/rate-limit` | Serverless API (GET) | Information Disclosure, Rate Limit Abuse |
| `/api/architecture` | Serverless API (POST) | Input Injection, Large AST DoS |
| `/api/debugging/analyze` | Serverless API (POST) | Massive Stacktrace Flooding, Token Exhaustion |
| `/api/search` | Serverless API (POST) | Regex Injection, Query Flooding |
| `MermaidViewer.tsx` | Client Component | Stored/DOM-based XSS via SVG Injection |
| `next.config.mjs` | HTTP Header Engine | Clickjacking, MIME Sniffing, Missing CSP |

### 1.2 Out-of-Scope Targets
- Upstream GitHub API infrastructure (`api.github.com`).
- Live production Vercel infrastructure (unauthorized load testing/fuzzing).
- Physical infrastructure or client device compromise.

---

## 2. Test Environment and Prerequisites

- **Staging Instance:** Local Next.js 14 instance bound to `http://127.0.0.1:3000`.
- **Test Runner:** Jest 29 with `ts-jest` runner.
- **Node Environment:** Node.js v20.x/v22.x LTS on Windows x64.
- **Payload Generation:** Synthetic payloads only; zero live credentials used.
- **Execution Script:** `npm test tests/security/securityControls.test.ts`.

---

## 3. Detailed Security Test Cases

### Category 1: Server-Side Request Forgery (SSRF)

#### TC-SSRF-01: AWS / Cloud Instance Metadata Exfiltration
- **Objective:** Verify that attacker-controlled `baseUrl` cannot probe cloud metadata service at `169.254.169.254`.
- **Endpoint:** `POST /api/ai/status` & `POST /api/ai/ask`
- **Payload:** `{"baseUrl": "http://169.254.169.254/latest/meta-data/"}`
- **Expected Result:** HTTP 400 Bad Request; body contains `{ "error": "Invalid or disallowed AI endpoint URL..." }`. No upstream request is dispatched.
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *rejects cloud metadata IP 169.254.169.254*).
- **Status:** **PASS** (Verified locally & unit tested).

#### TC-SSRF-02: Private RFC1918 Network Reconnaissance
- **Objective:** Verify that attacker-supplied private network addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked.
- **Endpoint:** `POST /api/ai/status`
- **Payload:** `{"baseUrl": "http://192.168.1.1:8080"}`
- **Expected Result:** HTTP 400 Bad Request; blocked by RFC1918 regex filter.
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *rejects private network subnets*).
- **Status:** **PASS** (Verified).

#### TC-SSRF-03: Arbitrary Loopback Port Scanning
- **Objective:** Ensure attacker cannot use localhost to scan non-AI local services (e.g., Redis on 6379, SSH on 22, internal admin panels on 8080).
- **Endpoint:** `POST /api/ai/status`
- **Payloads:**
  - `http://127.0.0.1:22`
  - `http://localhost:6379`
  - `http://127.0.0.1:8080`
- **Expected Result:** HTTP 400 Bad Request. Only loopback requests directed to port 11434 (default Ollama port) or standard local dev ports are permitted.
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *rejects arbitrary non-Ollama loopback ports*).
- **Status:** **PASS** (Verified).

#### TC-SSRF-04: Legitimate Loopback AI Provider Acceptance
- **Objective:** Ensure legitimate local developer workflow using Ollama on port 11434 remains 100% operational.
- **Endpoint:** `POST /api/ai/status`
- **Payload:** `{"baseUrl": "http://127.0.0.1:11434"}`
- **Expected Result:** Payload accepted by security validator; request forwards to local Ollama daemon.
- **Status:** **PASS** (Verified).

---

### Category 2: Path Traversal & Identifier Injection

#### TC-PATH-01: GitHub Raw Content Traversal via `path` Parameter
- **Objective:** Prevent directory traversal sequences from escaping the repository root.
- **Endpoint:** `GET /api/github/file?owner=facebook&repo=react&path=../../etc/passwd`
- **Payload:** `path=../../etc/passwd`
- **Expected Result:** HTTP 400 Bad Request; body contains `{ "error": "Invalid file path" }`.
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *rejects path traversal sequences*).
- **Status:** **PASS** (Verified).

#### TC-PATH-02: Windows-Style Backslash Traversal
- **Objective:** Verify that Windows directory separators (`..\..\win.ini`) are detected and neutralized.
- **Endpoint:** `GET /api/github/file?owner=facebook&repo=react&path=..\..\windows\win.ini`
- **Payload:** `path=..\..\windows\win.ini`
- **Expected Result:** HTTP 400 Bad Request.
- **Status:** **PASS** (Verified).

#### TC-ID-01: GitHub Owner / Repository Name Sanitization
- **Objective:** Ensure owner and repository parameters strictly comply with GitHub naming conventions (`^[a-zA-Z0-9_.-]{1,100}$`).
- **Endpoint:** `POST /api/github/import` & `GET /api/github/file`
- **Payloads:**
  - `owner=user/with/slashes`
  - `repo=repo;rm -rf`
  - `ref=main..HEAD`
- **Expected Result:** HTTP 400 Bad Request. Malformed identifiers rejected before any upstream fetch or memory allocation.
- **Automated Test:** `tests/security/securityControls.test.ts` (test cases: *rejects invalid GitHub owner names*, *rejects invalid GitHub repo names*).
- **Status:** **PASS** (Verified).

---

### Category 3: Denial of Service (DoS) & Resource Exhaustion

#### TC-DOS-01: Memory Exhaustion via Oversized Stacktrace
- **Objective:** Prevent memory bloat and CPU starvation caused by uploading multi-megabyte error logs to the debugger.
- **Endpoint:** `POST /api/debugging/analyze`
- **Payload:** Synthetic string exceeding 65,536 bytes.
- **Expected Result:** HTTP 400 Bad Request (`Stack trace exceeds maximum allowed size of 64KB`).
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *rejects oversized stack traces (>64KB)*).
- **Status:** **PASS** (Verified).

#### TC-DOS-02: AI Prompt Token Flooding
- **Objective:** Restrict prompt questions to 2,000 characters to prevent token exhaustion and API timeouts.
- **Endpoint:** `POST /api/ai/ask`
- **Payload:** `{"question": "A" * 2500}`
- **Expected Result:** HTTP 400 Bad Request (`Question exceeds maximum allowed length of 2000 characters`).
- **Status:** **PASS** (Verified).

#### TC-RATE-01: Sliding-Window IP Rate Limiter Enforcement
- **Objective:** Ensure abusive clients exceeding 60 requests per minute receive HTTP 429 Too Many Requests with proper `Retry-After` header.
- **Target:** All `/api/*` routes.
- **Execution:** Send 65 rapid requests from single IP `127.0.0.1`.
- **Expected Result:**
  - Requests 1–60: Processed normally (HTTP 200/400 depending on payload).
  - Request 61+: HTTP 429 Too Many Requests; headers contain `Retry-After: 60`.
- **Automated Test:** `tests/security/securityControls.test.ts` (test case: *blocks requests exceeding limit within time window*).
- **Status:** **PASS** (Verified).

---

### Category 4: Cross-Site Scripting (XSS) & Content Security

#### TC-XSS-01: Malicious SVG Tag Neutralization in Mermaid Diagrams
- **Objective:** Neutralize inline `<script>` tags, iframe embeds, and event handlers embedded in dynamically generated Mermaid SVG markup.
- **Target Component:** `src/components/architecture/MermaidViewer.tsx` via `sanitizeSvg()`
- **Payload:** `<svg><script>alert(document.cookie)</script><rect onload="evil()"/><a href="javascript:steal()"/></svg>`
- **Expected Result:** `sanitizeSvg()` strips `<script>...</script>`, deletes `onload="..."`, and replaces `javascript:` URLs with `about:blank`.
- **Automated Test:** `tests/security/securityControls.test.ts` (test cases: *strips script tags*, *removes onload attributes*, *neutralizes javascript: URIs*).
- **Status:** **PASS** (Verified).

#### TC-SEC-01: Browser Security Header Delivery
- **Objective:** Verify production HTTP response headers generated by `next.config.mjs`.
- **Expected Headers:**
  - `Content-Security-Policy`: Disallows unsafe object/base-uri plugins, restricts frame ancestors.
  - `X-Frame-Options`: `DENY` (Prevents Clickjacking).
  - `X-Content-Type-Options`: `nosniff` (Prevents MIME sniffing).
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), browsing-topics=()`.
- **Status:** **PASS** (Verified).

---

## 4. Execution Matrix and Verification Summary

| Test ID | Vulnerability Class | Tool / Method | Target Boundary | Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SSRF-01** | SSRF (Metadata) | Automated Jest + HTTP curl | `/api/ai/status` | **PASS** |
| **TC-SSRF-02** | SSRF (RFC1918) | Automated Jest + HTTP curl | `/api/ai/status` | **PASS** |
| **TC-SSRF-03** | SSRF (Port Scan) | Automated Jest + HTTP curl | `/api/ai/status` | **PASS** |
| **TC-SSRF-04** | SSRF (Legitimate) | Automated Jest + HTTP curl | `/api/ai/status` | **PASS** |
| **TC-PATH-01** | Path Traversal | Automated Jest + HTTP curl | `/api/github/file` | **PASS** |
| **TC-PATH-02** | Path Traversal (Win) | Automated Jest | `src/lib/security.ts` | **PASS** |
| **TC-ID-01** | Identifier Injection | Automated Jest + HTTP curl | GitHub API Proxies | **PASS** |
| **TC-DOS-01** | Payload Flooding | Automated Jest | `/api/debugging/analyze`| **PASS** |
| **TC-DOS-02** | Prompt Flooding | Automated Jest | `/api/ai/ask` | **PASS** |
| **TC-RATE-01** | Rate Limiting | Automated Jest Unit Suite | In-memory limiter | **PASS** |
| **TC-XSS-01** | SVG DOM XSS | Automated Jest DOM Suite | `MermaidViewer.tsx` | **PASS** |
| **TC-SEC-01** | Security Headers | Config static analysis | `next.config.mjs` | **PASS** |

**Regression Test Execution Command:**
```bash
npm test tests/security/securityControls.test.ts
```
**Test Results:** 15 passed, 0 failed, 15 total (1.182 s).
