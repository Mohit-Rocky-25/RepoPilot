# RepoPilot — Comprehensive Test, Architecture & Evaluation Kit
> **A complete evaluation, QA, and security validation dossier for testing RepoPilot with Claude or any AI auditor.**

---

## 📌 1. Project Identification & Live Environments

| Resource | Value / Direct Link |
| :--- | :--- |
| **Live Deployed Web Application** | [https://repo-pilot-git.vercel.app](https://repo-pilot-git.vercel.app) |
| **Official GitHub Repository** | [https://github.com/Mohit-Rocky-25/RepoPilot](https://github.com/Mohit-Rocky-25/RepoPilot) |
| **Production Platform** | Vercel Edge / Serverless (Next.js 14 App Router) |
| **License** | Open-Source (MIT) |
| **Cost Model** | ₹0 / $0 — Zero Mandatory Cloud API Spend (Local Ollama + deterministic parsing) |

---

## 🎯 2. System Mission & Core Value Proposition

**RepoPilot** is an open-source codebase intelligence platform designed for software engineers, tech leads, and open-source contributors navigating large, unfamiliar repositories.

### The Problem It Solves:
Software engineers spend up to 70% of their time reading existing code. When opening an unfamiliar repository, developers face:
1. **Missing Entry Points:** Large mono-repos or nested directories conceal where boot logic runs.
2. **Invisible Couplings:** Tracing connections across API handlers, services, and models requires days of manual reading.
3. **Hallucinating Chatbots:** Generic cloud AI chatbots hallucinate non-existent files and functions because they lack deterministic grounding in the repository revision.

### The RepoPilot Solution:
* **Interactive 3D Spatial Architecture Graph:** Visualizes repository module coupling in 3D WebGL space.
* **Instant Mermaid Architecture Maps:** Auto-generates clean, exportable Mermaid dependency charts.
* **Deterministic AST Symbol Indexing:** Instant regex & AST extraction of functions, classes, and interfaces across TypeScript, JavaScript, Python, Go, and Rust.
* **Stack Trace Correlator & Hypothesis Engine:** Maps production error stack frames to real source lines and drafts candidate unified PR diffs.
* **Evidence-Grounded Local AI (Ollama):** Optional local LLM explanations with verified clickable line-number citations.

---

## 🏗️ 3. Technical Architecture & Component Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RepoPilot Web UI (Next.js 14)                   │
├──────────────┬────────────────────────┬────────────────┬───────────────┤
│ 3D Graph     │ Mermaid Architecture   │ AST Symbol     │ Stack Trace   │
│ (Three.js)   │ (SVG Sanitized Viewer) │ Search Engine  │ Debugger      │
└──────┬───────┴───────────┬────────────┴───────┬────────┴───────┬───────┘
       │                   │                    │                │
┌──────▼───────────────────▼────────────────────▼────────────────▼───────┐
│                    Security & Rate Limiting Perimeter                  │
│  - CSP & Security Headers (X-Frame-Options: DENY, HSTS, nosniff)       │
│  - SSRF Validator (Blocks 169.254.169.254, RFC1918 subnets, bad ports) │
│  - Path Traversal & Identifier Filters (Alphanumeric repo/owner regex) │
│  - Sliding-Window IP Rate Limiter (60 req/min general, 30 req/min AI)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴─────────────────────────────┐
       │                                                          │
┌──────▼───────────────────────────────────┐    ┌─────────────────▼─────────────┐
│ GitHub REST Ingestion & Raw Content API  │    │ Local Ollama AI Daemon        │
│  - Commit SHA Pinning                    │    │ (http://127.0.0.1:11434)      │
│  - Tree recursion up to 1,500 files      │    │  - Bounded token prompts      │
│  - Binary & >100KB file filtering        │    │  - Strict citation validator  │
└──────────────────────────────────────────┘    └───────────────────────────────┘
```

---

## 🧪 4. Step-by-Step Test Scenarios for Claude to Evaluate

Give the following test cases to Claude to evaluate whether RepoPilot behaves as expected:

### Test Case 1: Public Repository Ingestion & SHA Pinning
* **Objective:** Ensure RepoPilot correctly parses GitHub URLs, pins the exact commit SHA, and filters binary files.
* **Steps:**
  1. Go to `https://repo-pilot-git.vercel.app`.
  2. Paste a public repository URL: `https://github.com/expressjs/express` or `https://github.com/facebook/react`.
  3. Click **Begin Exploration**.
* **Expected Outcome:**
  * RepoPilot resolves default branch HEAD to an immutable 40-character commit SHA.
  * The file tree loads up to 1,500 files while automatically excluding `node_modules`, `.png`, and `.lock` files.

### Test Case 2: 3D Spatial & Mermaid Architecture Visualization
* **Objective:** Validate that codebase coupling can be visually explored in 3D and 2D.
* **Steps:**
  1. In an imported repository, switch to the **Architecture** view.
  2. Test the **3D Spatial Graph**: click and drag to rotate the node network; hover over file clusters.
  3. Test the **Mermaid Diagram**: inspect the dynamically rendered module dependency chart.
* **Expected Outcome:**
  * High-connectivity files appear as larger central hubs in 3D.
  * Mermaid diagram generates cleanly and is sanitized against SVG script injection.

### Test Case 3: Deterministic AST Symbol Search
* **Objective:** Search for functions, interfaces, and classes without using any cloud AI tokens.
* **Steps:**
  1. Open the **Symbol Search** tab.
  2. Search for a common symbol name (e.g., `Router`, `listen`, `render`).
* **Expected Outcome:**
  * Results return instantly with exact file paths, symbol types (`function`, `class`, `interface`), and precise start/end line numbers.

### Test Case 4: Stack Trace Bug Investigation & Patch Drafting
* **Objective:** Verify that error logs are parsed, correlated with source files, and transformed into candidate patch diffs.
* **Steps:**
  1. Navigate to the **Debugging** section (`/debugging`).
  2. Paste a sample Node.js or Python stack trace:
     ```text
     TypeError: Cannot read properties of undefined (reading 'headers')
         at authenticate (src/middleware/auth.ts:24:18)
         at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)
         at next (node_modules/express/lib/router/route.js:144:13)
     ```
  3. Click **Analyze Error**.
* **Expected Outcome:**
  * Vendor frames (`node_modules`) are filtered out.
  * User-code frame (`src/middleware/auth.ts:24`) is highlighted.
  * System formulates ranked hypotheses and drafts a candidate unified diff.

### Test Case 5: Security Defense Verification (Penetration Test)
* **Objective:** Confirm that serverless endpoints reject malicious input.
* **Test Payloads:**
  * **SSRF Test:** Send POST to `/api/ai/status` with `{"baseUrl": "http://169.254.169.254"}` ➔ **Must return HTTP 400 Bad Request**.
  * **Path Traversal Test:** Send GET to `/api/github/file?owner=facebook&repo=react&path=../../etc/passwd` ➔ **Must return HTTP 400 Bad Request**.
  * **DoS Payload Test:** Send POST to `/api/debugging/analyze` with >64KB stacktrace ➔ **Must return HTTP 400 Bad Request**.
  * **Headers Test:** Inspect response headers on `https://repo-pilot-git.vercel.app` ➔ **Must contain `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`**.

---

## ⚡ 5. Ready-to-Run cURL Test Commands

You can run these commands directly in your terminal to test the live API endpoints:

```bash
# 1. Test SSRF Protection (Cloud Metadata Block)
curl -X POST https://repo-pilot-git.vercel.app/api/ai/status \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"http://169.254.169.254/latest/meta-data/"}'
# Expected response: {"error":"Invalid or disallowed AI endpoint URL. Remote IPs, cloud metadata, and private subnets are blocked."}

# 2. Test Path Traversal Protection
curl "https://repo-pilot-git.vercel.app/api/github/file?owner=expressjs&repo=express&path=../../etc/passwd"
# Expected response: {"error":"Invalid file path"}

# 3. Test Invalid GitHub Identifier Protection
curl -X POST https://repo-pilot-git.vercel.app/api/github/import \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/malicious;rm -rf/repo"}'
# Expected response: {"error":"Invalid repository URL format..."}

# 4. Test HTTP Security Headers
curl -I https://repo-pilot-git.vercel.app
# Verify: x-frame-options: DENY, x-content-type-options: nosniff, strict-transport-security
```

---

## 💬 6. Prompt to Give to Claude to Run the Full Evaluation

Copy and paste the prompt below into Claude:

```text
Please act as a Principal Full-Stack Engineer and Security Architect to test and evaluate RepoPilot (https://repo-pilot-git.vercel.app).

I have provided you with the RepoPilot Testing & Evaluation Kit. Please evaluate the platform across the following criteria:

1. Product-Market Fit & Engineering Utility:
   - Does RepoPilot solve the problem of onboarding into unfamiliar codebases better than manual file browsing?
   - How does the 3D spatial graph + Mermaid visualization impact code comprehension?

2. Architectural Rigor & Zero-Cost Model:
   - Assess the choice of deterministic AST symbol extraction over costly cloud embeddings.
   - Evaluate the privacy and latency benefits of local Ollama inference versus proprietary cloud APIs.

3. Security & Robustness Review:
   - Review the implemented defenses against SSRF, path traversal, SVG DOM XSS, and DoS payload exhaustion.
   - Are there any edge cases or architectural gaps in the serverless API proxy layer?

4. Feature Enhancement Suggestions:
   - Suggest 3 concrete features that would make RepoPilot an indispensable daily driver for open-source contributors and engineering teams.

Please provide a detailed, critical assessment based on the live app at https://repo-pilot-git.vercel.app and its source at https://github.com/Mohit-Rocky-25/RepoPilot.
```

---

## 📊 7. Test Suite Status

```bash
# Automated Vitest test suite running locally:
npm test
```
* **Test Suites:** 11 passed (11 total)
* **Total Tests:** 42 passed (42 total)
* **Security Suite:** 15/15 tests passing (`tests/security/securityControls.test.ts`)
* **TypeScript:** `npm run typecheck` ➔ 0 errors.
