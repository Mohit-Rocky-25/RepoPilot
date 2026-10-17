# Security Policy

## Supported Versions

RepoPilot receives regular security updates on the latest `main` branch.

| Version | Supported |
| :--- | :--- |
| `1.0.x` (current) | :white_check_mark: |
| `< 1.0.0` | :x: |

---

## Reporting a Security Vulnerability

We take the security of RepoPilot and user environments seriously. If you identify a security vulnerability, please **do not open a public issue**.

Instead, report it responsibly via:
- **GitHub Security Advisory**: Submit a private advisory at [https://github.com/Mohit-Rocky-25/RepoPilot/security/advisories/new](https://github.com/Mohit-Rocky-25/RepoPilot/security/advisories/new)
- **Maintainer Contact**: `yadavmohit12243@gmail.com`

Please include:
1. Description of the vulnerability.
2. Steps to reproduce or proof-of-concept repository URL.
3. Potential impact on the host environment or user data.

We will acknowledge receipt within 48 hours and work with you on remediation before public disclosure.

---

## Security Threat Model & Defenses

RepoPilot processes untrusted codebases from the public internet. Its security architecture implements strict defensive boundaries:

### In-Scope & Defended Threats:

1. **Server-Side Request Forgery (SSRF) Prevention**:
   - Repository URLs and custom AI base URLs are validated before outbound requests.
   - DNS resolution is performed prior to connection: loopback addresses (`127.0.0.1`, `::1`), private RFC1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local metadata addresses (`169.254.169.254`), and IPv4-mapped IPv6 equivalents (`::ffff:127.0.0.1`) are blocked.
   - HTTP redirects are inspected and re-validated against SSRF allowlists.

2. **Gzipped Tarball Extraction Security**:
   - Repositories are streamed from `codeload.github.com` via a single gzipped tarball.
   - Protection against zip-bombs and decompression attacks: 25MB archive cap, 100KB per-file cap, and 1,500 file extraction limit.
   - Files with directory traversal sequences (`../`), absolute paths, null bytes, or symlinks escaping the repository root are rejected.

3. **Path Traversal Mitigation**:
   - File retrieval and search APIs validate paths against directory traversal (`..`) and null bytes. All paths resolve virtually against the repository root.

4. **DOM-Based SVG XSS Defense**:
   - Architecture diagrams generated via Mermaid are sanitized using DOMParser before insertion into the DOM.
   - Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, inline event handlers (`onload`, `onerror`), and `javascript:` URIs.

5. **Prompt Injection Hardening**:
   - Repository source files passed into LLM context are isolated within structured XML CDATA tags (`<untrusted_repo_content>`).
   - System prompts instruct models to treat repository content strictly as data and never execute instructions found within repository files.

6. **In-Memory Patch Validation & Sandboxing**:
   - RepoPilot **never** executes untrusted repository code, build scripts, or test runners.
   - Proposed patches are validated in memory against pinned file lines. Conflicting or invalid hunks are rejected.

7. **Client-Side Secret Isolation**:
   - Optional GitHub Personal Access Tokens (PATs) and BYO AI provider keys default strictly to browser `sessionStorage`.
   - Keys are kept in memory for the active browser session, never persisted to server databases, never logged, and redacted from error outputs.

8. **Rate Limiting & Abuse Prevention**:
   - Platform-trusted client IP extraction (`x-vercel-forwarded-for`, `req.ip`) prevents spoofed `X-Forwarded-For` bypasses.
   - Multi-tier route-class rate limiting backed by `@upstash/ratelimit` when configured, with an in-memory sliding-window fallback. Request bodies are capped at 64KB on AI and debugger routes.

---

### Out-of-Scope & Known Threat Boundaries:

- **Serverless In-Memory Rate Limiting**: When deployed without Upstash Redis, in-memory rate limiting is best-effort and does not synchronize state across distinct serverless instances.
- **Untrusted Code Execution**: Users are responsible for inspecting candidate patches before running them on their local machines. RepoPilot labels all generated patches as `"Unverified: review before applying"`.
- **Public GitHub Quota Exhaustion**: Unauthenticated requests are subject to GitHub's 60 req/hr IP limit. Users experiencing rate limits should provide a scoped PAT.
