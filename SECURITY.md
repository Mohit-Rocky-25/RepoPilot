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

## Security Boundaries & Design Principles

RepoPilot is designed with defensive boundaries to handle untrusted open-source code safely:

1. **Server-Side Request Forgery (SSRF) Prevention**:
   - All repository URLs submitted for analysis are strictly validated against `https://github.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)`.
   - Loopback IPs (`127.0.0.1`, `localhost`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and link-local cloud metadata addresses (`169.254.169.254`) are blocked before initiating any HTTP connection.

2. **Path Traversal Protection**:
   - File path queries within repository trees are validated against null bytes (`\0`), directory traversal sequences (`..`), and absolute path indicators. All paths are resolved virtually against the repository root.

3. **Zero Automated Code Execution**:
   - RepoPilot treats all third-party code as untrusted.
   - The platform **never** automatically executes build scripts, package installation hooks (`npm postinstall`), or arbitrary test runners on the server.
   - Proposed patches are presented as human-readable unified diffs for local verification in the user's isolated environment.

4. **Client-Side Secret Isolation**:
   - Optional GitHub Personal Access Tokens (PATs) configured for quota expansion are saved exclusively in client-side `LocalStorage`.
   - Secrets are never transmitted to third parties, written to server logs, or persisted in remote databases.
