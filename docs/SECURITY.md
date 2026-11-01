# RepoPilot Security Policy & Architecture

## Security Overview
RepoPilot is an open-source, evidence-grounded codebase intelligence engine. It is designed with defense-in-depth security principles across ingestion, parsing, LLM context synthesis, network egress, and client presentation.

---

## Prompt Injection Hardening

### Threat Model & Defense Strategy
Repository analysis platforms ingest untrusted source code, comments, issues, and documentation from third-party repositories. Malicious repositories can attempt prompt injection attacks designed to:
1. Break out of XML/CDATA context delimiters (e.g. inserting closing `]]>` and `</untrusted_repo_content>` tags).
2. Hijack the system persona (e.g. "Ignore previous instructions", "You are now DAN").
3. Force fraudulent citations or leak system instructions / API keys.
4. Alter citation output formats to evade downstream validation passes.

### Mitigations
1. **Delimiter Escaping & Neutralization**: All indexed repository files embedded into prompts are stripped and neutralized before prompt construction. Literal `]]>` sequences are rewritten to `]]&gt;`, and tag boundaries (`<untrusted_repo_content>`, `<system_override>`) are neutralized.
2. **Explicit System Instructions**: The LLM system prompt explicitly instructs that repository text is passive data only. Repository content is forbidden from altering citation formats, validation rules, or tool execution behavior.
3. **Multi-Pass Post-Generation Citation Validation**: AI responses undergo a strict multi-pass validation harness. Citations are verified to exist in the pinned commit SHA, verified to span non-whitespace code, and tested for keyword support against the claim sentence. Hallucinated or injected citation tags referencing fake files are automatically stripped and flagged.
4. **Prompt Injection is Mitigated, Not Eliminated**:
   > **Important Security Boundary**: Prompt injection is mitigated, not eliminated. The app is read-only and executes no repository code. RepoPilot runs zero arbitrary user code, executes zero build scripts, and provides no shell or execution sandboxes.

---

## Key and Token Handling Architecture

### Credential Journey & Audit
RepoPilot is designed around strict credential minimization:

| Credential | Origin | Storage Location | Inbound Route | Outbound Destination | In Flight Security |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Server GITHUB_TOKEN** | Host environment variable (`GITHUB_TOKEN`) | Server process memory only | N/A (Server-side) | `https://api.github.com/*` | Carried strictly in `Authorization: Bearer <token>` to allowlisted host `api.github.com`. Never sent to `codeload.github.com` or third parties. |
| **Client GitHub PAT** | User input in Settings UI | Browser `localStorage` | `/api/github/*` via `X-GitHub-Token` header | `https://api.github.com/*` | Proxied through internal API routes over TLS. Never stored in server database or server logs. |
| **User AI Keys** (BYO Key) | User input in Settings / Assistant UI | Browser `sessionStorage` (tab lifetime only) | `/api/ai/ask` and `/api/ai/capabilities` via request body or `x-ai-key` header | Upstream AI Provider (OpenAI, Anthropic, Gemini, Groq, OpenRouter) | Transmitted via TLS. Server instantiates transient provider client in memory for the request duration and discards key immediately. Never persisted to disk, Redis, or session cookies. |

### Redaction Across All Error Paths
1. All error paths in API routes pass error messages through `sanitizeErrorMessage()` before serializing to HTTP responses or logs.
2. Sanitization automatically detects and redacts:
   - OpenAI API keys (`sk-[a-zA-Z0-9_\-]{20,}`)
   - Anthropic API keys (`sk-ant-[a-zA-Z0-9_\-]{20,}`)
   - Google Gemini API keys (`AIza[0-9A-Za-z\-_]{30,45}`)
   - GitHub PATs (`ghp_...`, `github_pat_...`, `gho_...`, `ghs_...`)
   - Bearer tokens (`Bearer [REDACTED]`)
   - URL query parameters (`?api_key=...`, `&token=...`)
   - JSON structured keys (`{"apiKey": "[REDACTED]"}`)
   - Windows and Unix absolute filesystem paths (`[REDACTED_PATH]`)
   - Internal stack traces

### Security Headers & Browser Sandbox
`next.config.mjs` enforces defense-in-depth headers on all routes:
- **Content-Security-Policy**: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com https://codeload.github.com http://localhost:11434 http://127.0.0.1:11434; frame-ancestors 'none';`
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing)
- **Referrer-Policy**: `strict-origin-when-cross-origin` (prevents credential leaks in Referer headers)
- **X-Frame-Options**: `DENY` & **frame-ancestors**: `'none'` (prevents clickjacking)
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=()` (disables hardware APIs)
- **SVG / Mermaid Rendering**: Compatible with CSP via deterministic client-side DOM rendering and SVG tag attribute sanitization (`sanitizeSvg`).
