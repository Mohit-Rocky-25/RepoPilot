# RepoPilot — Universal Security Checklist

This document tracks the audit status of all security controls across the RepoPilot application. Every item is verified against the codebase implementation.

---

### A. Authentication & Identity
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Password storage & hashing** | `NOT APPLICABLE` | RepoPilot is a zero-account, zero-database application. No user accounts or passwords are stored. |
| **Rate limits on sensitive endpoints** | `PASS` | `rateLimiter.ts` enforces 30–60 req/min sliding-window IP throttling across all API endpoints. |
| **Session management & identifiers** | `NOT APPLICABLE` | Stateless application; no server-side sessions or cookies exist. |
| **Third-party OAuth / GitHub tokens** | `PASS` | Optional user Personal Access Tokens (PATs) are stored exclusively in client-side `localStorage` and sent via `x-github-token` header. Server never writes them to disk or logs. |
| **Identity shielding & exposure** | `PASS` | `/api/github/rate-limit` enforces strict privacy shielding. Public visitors receive `mode: "public-tier"` with owner identity stripped. |

---

### B. Authorization & Access Control
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Server-side validation** | `PASS` | All parameters (`owner`, `repo`, `sha`, `path`) are validated on the server in route handlers using `src/lib/security.ts`. |
| **Object-level authorization** | `PASS` | Operations access public GitHub repositories via GitHub's public API. Private repository access is strictly gated by the caller's own PAT. |
| **Mass assignment protection** | `PASS` | Zod schemas (`ImportRequestSchema`, `SearchQuerySchema`) strictly strip undeclared fields. |
| **Privilege escalation** | `NOT APPLICABLE` | No role-based access control or user tiers exist on the server. |

---

### C. Input Validation & Injection
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **SQL / NoSQL / ORM Injection** | `NOT APPLICABLE` | Zero database architecture. No SQL or ORM queries are executed. |
| **Command Injection (RCE)** | `PASS` | The server never executes shell commands (`exec`, `spawn`, `child_process`) from user input. AST parsing and search run purely in TypeScript memory. |
| **Cross-Site Scripting (XSS)** | `PASS` | React automatically escapes JSX expressions. Vector SVG diagrams in `MermaidViewer.tsx` are sanitized via `sanitizeSvg()` removing `<script>` and `onload`. |
| **Path Traversal** | `PASS` | `validateFilePath()` strictly rejects null bytes (`\0`), leading slashes, and `..` traversal sequences. |
| **Server-Side Request Forgery (SSRF)** | `PASS` | `validateOllamaEndpoint()` prevents outbound connections to cloud metadata (`169.254.169.254`), private RFC1918 subnets, and non-standard loopback ports. |
| **ReDoS & Resource Exhaustion** | `PASS` | String payloads are bounded: `stackTrace` capped at 64 KB, `question` at 2,000 chars, `query` at 256 chars. Search limits are clamped to max 100 results. |

---

### D. API & Protocol Security
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **HTTP Methods & Status Codes** | `PASS` | Explicit `export async function GET` and `POST` handlers return standard HTTP 200, 400, 429, and 500 status codes. |
| **Rate Limiting & Abuse Prevention** | `PASS` | `rateLimiter.ts` limits requests per IP and emits standard retry timings on HTTP 429. |
| **CORS & Cross-Origin Boundaries** | `PASS` | Same-origin default enforced by Next.js; CSP restricts form actions and base URI. |
| **Clickjacking Defense** | `PASS` | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` configured in `next.config.mjs`. |
| **MIME Sniffing Defense** | `PASS` | `X-Content-Type-Options: nosniff` configured in `next.config.mjs`. |
| **HSTS Enforcement** | `PASS` | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` configured in `next.config.mjs`. |

---

### E. Database, Storage, and Data Privacy
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Database credentials** | `NOT APPLICABLE` | Zero databases configured. |
| **Sensitive data in transit** | `PASS` | All communication with GitHub uses TLS 1.3 / HTTPS. All client requests to Vercel production use enforced HTTPS. |
| **Secret logging prevention** | `PASS` | API logs do not log authorization headers or tokens. Console errors are sanitized. |
| **Data retention & minimization** | `PASS` | Analyzed code trees are held temporarily in-memory with a 10-minute cache TTL (`cache.ts`), then discarded. Zero persistent user data is collected. |

---

### F. Secrets & Configuration
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Hardcoded secrets in source** | `PASS` | Automated secret scan found 0 credentials. |
| **Git history clean of tokens** | `PASS` | Git commit history inspected; `.env.local` is gitignored and was never tracked. |
| **Environment variable safety** | `PASS` | Optional `GITHUB_TOKEN` is loaded securely via `process.env.GITHUB_TOKEN`. If absent, the app gracefully operates in anonymous mode. |
| **Safe failure modes** | `PASS` | If `GITHUB_TOKEN` is invalid, the app falls back to anonymous rate tracking and notifies user gracefully. |

---

### G. Frontend & Browser Security
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Content Security Policy (CSP)** | `PASS` | Strict CSP policy configured in `next.config.mjs`. |
| **Open Redirects** | `PASS` | All internal navigation uses Next.js router. External links to GitHub documentation use hardcoded HTTPS targets with `rel="noreferrer"`. |
| **Client bundle secrets** | `PASS` | No `NEXT_PUBLIC_*` secrets exist. Server `GITHUB_TOKEN` is never exposed in client JavaScript bundles. |
| **Local storage isolation** | `PASS` | User-provided tokens in `localStorage` are accessible only to the origin `repo-pilot-git.vercel.app`. |

---

### H. File Uploads, Downloads & Document Processing
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **File uploads** | `NOT APPLICABLE` | RepoPilot does not accept user file uploads. All code is ingested via GitHub APIs directly from source repositories. |
| **SVG Export** | `PASS` | Exported Mermaid SVG diagrams are sanitized via `sanitizeSvg()` before client download. |

---

### I. Business Logic & Abuse Prevention
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **API Quota Depletion** | `PASS` | 5,000 req/hr rate limit status is tracked in-memory. Fastly CDN raw fetches bypass REST rate limits completely. |
| **Recursive Ingestion Bombs** | `PASS` | `fetchTree` caps file ingestion at 1,500 files and filters out `node_modules/`, `.git/`, and binary blobs. |
| **AST Parser Stack Overflow** | `PASS` | Regex and tokenizer patterns are bounded and non-backtracking. |

---

### J. Dependencies & Software Supply Chain
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Package lockfile integrity** | `PASS` | `package-lock.json` committed with exact SHA-512 integrity hashes. |
| **Direct dependencies** | `PASS` | Minimal direct dependencies: `next`, `react`, `react-dom`, `lucide-react`, `zod`. |
| **Vulnerability audit** | `PASS` | Evaluated via `npm audit`. Known Next.js / Tailwind dev warnings do not affect serverless API route handlers. |

---

### K. Infrastructure, Deployment & Operations
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Serverless edge execution** | `PASS` | Runs on Vercel's global edge network with automatic TLS termination and DDoS mitigation. |
| **Container isolation** | `PASS` | Multi-stage `Dockerfile` uses non-root user `nextjs:nodejs` on Alpine Linux. |
| **CI/CD permissions** | `PASS` | GitHub Actions workflow runs `tsc --noEmit` and `vitest run` on read-only permissions. |

---

### L. Cryptography & Sensitive Operations
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Cryptographic algorithms** | `PASS` | Modern TLS 1.3 in transit. SHA-1/SHA-256 validation for Git commit objects. |
| **Custom cryptography** | `PASS` | Zero custom cryptography implemented. |

---

### M. Logging, Errors & Observability
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Error masking & boundaries** | `PASS` | `src/app/error.tsx` intercepts runtime errors, masking stack traces and internal paths from visitors. |
| **Sensitive field logging** | `PASS` | Zero authorization tokens or request bodies are logged. |

---

### N. AI & Agent Security
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Prompt Injection Defense** | `PASS` | Prompts built in `PromptBuilder` use strict separation between system instructions and grounded code context. |
| **Hallucination & Citation Check** | `PASS` | `CitationValidator` automatically verifies extracted source references against the actual repository tree before displaying answers. |
| **SSRF via AI endpoints** | `PASS` | `validateOllamaEndpoint()` prevents arbitrary network requests via `baseUrl`. |
| **Automated Tool Execution** | `PASS` | RepoPilot provides read-only codebase intelligence. The AI cannot execute shell commands or modify remote repositories. |

---

### O. Mobile, Desktop & Distributed Systems
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Distributed / Cloud Boundaries** | `PASS` | Next.js serverless functions communicate only with GitHub REST API and Fastly CDN. |

---

### P. Privacy & Compliance
| Check | Status | Evidence & Details |
| :--- | :---: | :--- |
| **Data minimization** | `PASS` | No user personal data, cookies, or analytics tracking cookies are stored. |
| **GDPR / Privacy compliance** | `PASS` | 100% compliant with privacy-by-design principles: zero user tracking, zero data storage. |
