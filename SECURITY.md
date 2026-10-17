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
2. Steps to reproduce or proof-of-concept repository URL / payload.
3. Potential impact on the host environment or user data.

We will acknowledge receipt within 48 hours and work with you on remediation before public disclosure.

---

## Security Threat Model & Defenses

RepoPilot processes untrusted codebases from the public internet. Its security architecture implements strict defensive boundaries:

### In-Scope & Defended Threats:

1. **Server-Side Request Forgery (SSRF) Prevention**:
   - Repository URLs and custom AI base URLs are validated before outbound requests.
   - Comprehensive IP classification via standard 32-bit conversion: blocks dotted decimal, decimal integer (`2130706433`), hex (`0x7f000001`, `0xa9fea9fe`), dotted hex (`0x7f.1`), octal (`0177.0.0.1`), shorthand (`127.1`), and IPv4-mapped IPv6 (`::ffff:127.0.0.1`).
   - Private RFC1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local metadata addresses (`169.254.169.254`), carrier-grade NAT (`100.64.0.0/10`), multicast/reserved ranges, and internal cloud metadata hostnames (`metadata.google.internal`) are blocked.
   - Hostnames are pre-resolved via DNS to defend against DNS-rebinding attacks. Loopback connections are restricted strictly to local Ollama on port `11434`.

2. **Path Traversal & Injection Defense**:
   - Multi-pass decoding (up to 3 rounds) defeats single (`%2e%2e%2f`) and double (`%252e%252e%252f`) URL-encoding bypasses.
   - Rejects null bytes in literal (`\0`) and hex-encoded (`%00`) forms.
   - Rejects directory traversal sequences (`../`, `..\`), leading slashes, Windows drive roots (`C:\`, `C:/`), and UNC network shares (`\\`).

3. **Identifier Sanitization & Homoglyph Defense**:
   - Owner and repository handles are restricted to ASCII `^[a-zA-Z0-9_.-]{1,100}$`.
   - Protects against Unicode lookalikes / Cyrillic homoglyphs, emojis, and special path tokens (`.`, `..`).

4. **ReDoS Resilience & Size Caps**:
   - Regular expressions across indexing, debugging, and import parsers are audited to guarantee linear time complexity with bounded quantifiers.
   - Stack traces are capped at 64 KB, preventing memory exhaustion or regex stalls on adversarial payloads.

5. **Error Sanitization & Secret Leak Prevention**:
   - Error responses pass through `sanitizeErrorMessage` and `redactSecret`.
   - Local filesystem paths (`C:\Users\...`, `/home/...`), secret tokens (`sk-...`, `ghp_...`, `Bearer ...`), and internal stack traces are redacted before delivery to clients.

6. **Gzipped Tarball Extraction Security**:
   - Repositories are streamed from `codeload.github.com` via a single gzipped tarball.
   - Protection against zip-bombs: 25MB archive cap, 100KB per-file cap, and 1,500 file extraction limit.

7. **DOM-Based SVG XSS Defense**:
   - Architecture diagrams generated via Mermaid are sanitized using DOMParser before insertion into the DOM.
   - Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, inline event handlers (`onload`, `onerror`), and `javascript:` URIs.

8. **Prompt Injection Hardening**:
   - Repository source files passed into LLM context are isolated within structured XML CDATA tags (`<untrusted_repo_content>`).
   - System prompts instruct models to treat repository content strictly as data and never execute instructions found within repository files.

9. **In-Memory Patch Validation & Sandboxing**:
   - RepoPilot **never** executes untrusted repository code, build scripts, or test runners.
   - Proposed patches are validated in memory against pinned file lines.

10. **Client-Side Secret Isolation**:
    - Optional GitHub Personal Access Tokens (PATs) and BYO AI provider keys default strictly to browser `sessionStorage`.
    - Keys are kept in memory for the active browser session, never persisted to server databases, never logged, and redacted from error outputs.

11. **Security Headers & CSP**:
    - Next.js enforces `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`.

12. **Continuous Vulnerability & Secret Scanning**:
    - Automated secret scanning via `npm run security:scan` (`scripts/secret_scan.js`).
    - Dependabot enabled (`.github/dependabot.yml`) for automated dependency alerts.

---

### Out-of-Scope & Known Threat Boundaries:

- **Serverless In-Memory Rate Limiting**: When deployed without Upstash Redis, in-memory rate limiting is best-effort and does not synchronize state across distinct serverless instances.
- **Untrusted Code Execution**: Users are responsible for inspecting candidate patches before running them on their local machines. RepoPilot labels all generated patches as `"Unverified: review before applying"`.
- **Public GitHub Quota Exhaustion**: Unauthenticated requests are subject to GitHub's 60 req/hr IP limit. Users experiencing rate limits should provide a scoped PAT.
- **Upstream Framework Audit Notes**: `npm audit` flags vulnerabilities in `next` v14 and dev tooling (`vitest`, `esbuild`). Upgrading Next.js to v16 requires migrating to React 19; Dependabot is configured to track backward-compatible patch releases.
