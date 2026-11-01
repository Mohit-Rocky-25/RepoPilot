# GitHub App OAuth Architecture & Security Design

**Status:** Scaffolded & Behind Feature Flag (`ENABLE_GITHUB_APP_OAUTH=false`)  
**Design Level:** Senior Security Engineering Specification  
**Principle:** Zero Server-Side Persistence & Least-Privilege Ingestion  

---

## 1. Executive Summary & Problem Definition

RepoPilot allows developers to explore and debug public and private GitHub repositories. For private repositories, users traditionally generate a Personal Access Token (PAT). However, manual PAT generation poses common user friction and security challenges:
1. **Excessive Privileges:** Users often select classic `repo` scope (which includes full write and repository administrative capabilities) rather than minimal read-only permissions.
2. **Perpetual Lifetimes:** Classic PATs are frequently created with 90-day or no expiration limits.
3. **Storage Misconfigurations:** Insecure clients store tokens in `localStorage`, exposing credentials to persistent cross-site exfiltration.

To solve this, RepoPilot implements an optional **GitHub App OAuth 2.0 Flow with PKCE (Proof Key for Code Exchange)** combined with an uncompromising **Zero Server-Side Persistence** guarantee.

---

## 2. Core Architecture: Zero Server-Side Persistence

Unlike traditional SaaS web applications that store OAuth `access_token` and `refresh_token` credentials in server-side databases (PostgreSQL, Redis, etc.), RepoPilot is architected to operate with **zero server credential custody**:

```
[ User Browser ]              [ RepoPilot Next.js API ]            [ GitHub OAuth ]
       |                                |                                 |
       | 1. Click "Connect GitHub"      |                                 |
       |------------------------------->|                                 |
       |                                | 2. Generate PKCE verifier       |
       |                                |    & state, set HttpOnly cookie |
       | 3. Redirect to GitHub Auth     |<--------------------------------|
       |----------------------------------------------------------------->|
       |                                                                  |
       | 4. User Approves Read-Only Access                                |
       |<-----------------------------------------------------------------|
       |                                                                  |
       | 5. Callback with code & state                                    |
       |------------------------------->|                                 |
       |                                | 6. Verify state & cookie        |
       |                                | 7. Exchange code + verifier     |
       |                                |-------------------------------->|
       |                                |<--------------------------------|
       |                                | 8. Receive temporary token      |
       |                                |    (NEVER written to DB or disk)|
       | 9. HTML transient postMessage  |                                 |
       |<-------------------------------|                                 |
       |                                |                                 |
[ sessionStorage ]                      |                                 |
(In-Memory Per Tab)                     |                                 |
```

### Protocol Steps:
1. **Initiation (`/api/auth/github/login`)**:
   - The server verifies `isOAuthEnabled()` feature flag.
   - Generates a cryptographically random `state` (32 bytes `base64url`).
   - Generates a PKCE `code_verifier` (32 bytes `base64url`).
   - Computes PKCE `code_challenge = Base64Url(SHA-256(code_verifier))`.
   - Stores `state:code_verifier` in an encrypted, short-lived (10 min), `HttpOnly`, `SameSite=Lax`, `Secure` cookie `repopilot_oauth_state`.
   - Redirects user to GitHub's authorization endpoint.

2. **Authorization**:
   - User grants permission on GitHub.
   - GitHub redirects back to `/api/auth/github/callback?code=...&state=...`.

3. **Exchange (`/api/auth/github/callback`)**:
   - The route validates `code` and verifies `state` against the `repopilot_oauth_state` cookie using constant-time string comparison.
   - Performs backend token exchange via `POST https://github.com/login/oauth/access_token` with `code_verifier`.
   - Upon receiving `access_token`, the server deletes the cookie immediately.

4. **Client Handoff**:
   - The server responds with a minimal HTML document that executes an in-memory script:
     `sessionStorage.setItem("REPOPILOT_GH_TOKEN", token)`
   - Dispatches a `postMessage` event to `window.opener` with strict `window.location.origin` target verification.
   - Closes the popup window or redirects to `/settings`.
   - **Zero Persistence Guarantee:** The server does not log the token, write it to any database, or retain it in application memory beyond the immediate HTTP request lifecycle.

---

## 3. Threat Model & Open Security Risks

| Threat / Risk Vector | Likelihood | Impact | Built-in Defense & Mitigation |
| :--- | :--- | :--- | :--- |
| **Authorization Code Interception** | Medium | High | **RFC 7636 PKCE (S256):** Even if an authorization code is intercepted in transit, an attacker cannot exchange it without the original client `code_verifier`. |
| **CSRF Login Injection** | Medium | Medium | **High-Entropy State Cookie:** Cryptographic 256-bit state validated against an `HttpOnly`, `SameSite=Lax` cookie. |
| **Server Database Compromise** | Low | Critical | **Zero Server Storage:** Because RepoPilot stores zero user tokens on the backend, a server compromise yields zero user GitHub credentials. |
| **Client-Side XSS Attack** | Low | High | **Strict CSP & SessionStorage:** Tokens reside in `sessionStorage` (isolated per tab and cleared on close). Strict Content-Security-Policy blocks unauthorized scripts and external exfiltration. |
| **Scope Escalation** | Medium | High | **Token Scope Validation:** The token inspector inspects `X-OAuth-Scopes` and emits warnings if elevated permissions (`admin:*`, `delete_repo`, `workflow`) are detected. |
| **Log Leakage** | Low | High | **Global Key Redactor:** `src/lib/security.ts` automatically scrubs all token patterns (`ghp_`, `github_pat_`, `Bearer ...`) from all error and log channels. |

---

## 4. Open Limitations & Future Enhancements

1. **Multi-Tab Synchronization:**
   - Because tokens are held strictly in `sessionStorage`, opening RepoPilot in a new browser tab requires re-entering the token or completing the OAuth handshake again. This is an intentional security design choice that prevents background tab cross-talk.
2. **Fine-Grained GitHub App Installations:**
   - Future iterations will introduce GitHub App Installation tokens (scoped to individual organization repositories) rather than User-to-Server tokens.
3. **Token Refresh Rotation:**
   - If GitHub OAuth App refresh tokens are enabled, a client-driven refresh endpoint (`/api/auth/github/refresh`) will be needed to exchange expiring tokens without server-side persistence.
