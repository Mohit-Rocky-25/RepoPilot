import { describe, it, expect } from "vitest";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  validateOllamaEndpoint,
  sanitizeSvg
} from "../../src/lib/security";
import { rateLimiter } from "../../src/lib/rateLimiter";

describe("Security Validation & Defensive Controls", () => {
  describe("SSRF Prevention (validateOllamaEndpoint)", () => {
    it("should reject AWS/GCP/Azure link-local cloud metadata IP (169.254.169.254)", () => {
      const result = validateOllamaEndpoint("http://169.254.169.254/latest/meta-data");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cloud metadata");
    });

    it("should reject cloud internal metadata hostnames", () => {
      const result = validateOllamaEndpoint("http://metadata.google.internal/computeMetadata/v1/");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("internal cloud metadata");
    });

    it("should reject loopback connections to non-Ollama ports (prevents port scanning)", () => {
      const port80 = validateOllamaEndpoint("http://localhost:80");
      expect(port80.valid).toBe(false);

      const port22 = validateOllamaEndpoint("http://127.0.0.1:22");
      expect(port22.valid).toBe(false);

      const port3000 = validateOllamaEndpoint("http://localhost:3000/internal-api");
      expect(port3000.valid).toBe(false);
    });

    it("should reject private RFC1918 subnets", () => {
      expect(validateOllamaEndpoint("http://10.0.0.1:8080").valid).toBe(false);
      expect(validateOllamaEndpoint("http://192.168.1.1:8080").valid).toBe(false);
      expect(validateOllamaEndpoint("http://172.16.5.1:8080").valid).toBe(false);
    });

    it("should reject non-HTTP protocols", () => {
      expect(validateOllamaEndpoint("file:///etc/passwd").valid).toBe(false);
      expect(validateOllamaEndpoint("gopher://127.0.0.1:11434").valid).toBe(false);
      expect(validateOllamaEndpoint("ftp://localhost:11434").valid).toBe(false);
    });

    it("should allow valid standard local Ollama endpoints", () => {
      expect(validateOllamaEndpoint("http://localhost:11434").valid).toBe(true);
      expect(validateOllamaEndpoint("http://127.0.0.1:11434").valid).toBe(true);
      expect(validateOllamaEndpoint(undefined).valid).toBe(true);
    });
  });

  describe("Comprehensive SSRF Defense & IP Classification (isPrivateOrReservedIp, validateAiEndpoint)", () => {
    it("identifies private IPv4, loopback, and metadata addresses", async () => {
      const { isPrivateOrReservedIp } = await import("../../src/lib/security");
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.5.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.100")).toBe(true);
      expect(isPrivateOrReservedIp("172.20.1.1")).toBe(true);
      expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);
      // Public IPs
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
    });

    it("identifies IPv6 loopback, ULA, link-local, and IPv4-mapped addresses", async () => {
      const { isPrivateOrReservedIp } = await import("../../src/lib/security");
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
    });

    it("identifies decimal integer IP encodings", async () => {
      const { isPrivateOrReservedIp } = await import("../../src/lib/security");
      // 2852039166 === 169.254.169.254
      expect(isPrivateOrReservedIp("2852039166")).toBe(true);
    });

    it("enforces HTTPS for remote hosted AI endpoints and rejects HTTP", async () => {
      const { validateAiEndpoint } = await import("../../src/lib/security");
      const httpRes = await validateAiEndpoint("http://api.openai.com/v1", { allowLoopbackOllama: false });
      expect(httpRes.valid).toBe(false);
      expect(httpRes.reason).toContain("https://");

      const loopbackBlocked = await validateAiEndpoint("http://localhost:11434", { allowLoopbackOllama: false });
      expect(loopbackBlocked.valid).toBe(false);
      expect(loopbackBlocked.reason).toContain("Loopback connections are not allowed");
    });
  });

  describe("Path Traversal Defense (validateFilePath)", () => {
    it("should reject directory traversal sequences", () => {
      expect(validateFilePath("../etc/passwd")).toBe(false);
      expect(validateFilePath("foo/../../bar")).toBe(false);
      expect(validateFilePath("..\\windows\\system32")).toBe(false);
      expect(validateFilePath("nested/../../../secret.env")).toBe(false);
    });

    it("should reject absolute paths and null bytes", () => {
      expect(validateFilePath("/etc/shadow")).toBe(false);
      expect(validateFilePath("\\root\\secrets")).toBe(false);
      expect(validateFilePath("file\0.ts")).toBe(false);
    });

    it("should allow legitimate repository file paths", () => {
      expect(validateFilePath("src/index.ts")).toBe(true);
      expect(validateFilePath("components/ui/Button.tsx")).toBe(true);
      expect(validateFilePath("package.json")).toBe(true);
      expect(validateFilePath(".github/workflows/ci.yml")).toBe(true);
    });
  });

  describe("Identifier Validation (validateGitHubOwner & validateGitHubRepo)", () => {
    it("should reject path injection and special characters in owner/repo", () => {
      expect(validateGitHubOwner("user/../../evil")).toBe(false);
      expect(validateGitHubRepo("repo/../other")).toBe(false);
      expect(validateGitHubOwner(".")).toBe(false);
      expect(validateGitHubRepo("..")).toBe(false);
      expect(validateGitHubOwner("<script>alert(1)</script>")).toBe(false);
      expect(validateGitHubRepo("repo; rm -rf /")).toBe(false);
      expect(validateGitHubRepo("repo with spaces")).toBe(false);
    });

    it("should allow valid GitHub handles and repository names", () => {
      expect(validateGitHubOwner("Mohit-Rocky-25")).toBe(true);
      expect(validateGitHubRepo("RepoPilot")).toBe(true);
      expect(validateGitHubRepo("next.js")).toBe(true);
      expect(validateGitHubRepo("react_native")).toBe(true);
    });
  });

  describe("SVG XSS Sanitizer (sanitizeSvg)", () => {
    it("should strip executable scripts and inline event handlers", () => {
      const malicious = `<svg><script>alert('XSS')</script><circle onload="alert('XSS')" cx="10" cy="10" r="5" /></svg>`;
      const clean = sanitizeSvg(malicious);
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("onload=");
      expect(clean).toContain("<circle");
    });

    it("should neutralize javascript: href schemes", () => {
      const malicious = `<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>`;
      const clean = sanitizeSvg(malicious);
      expect(clean).not.toContain("javascript:alert(1)");
      expect(clean).toContain('href="#"');
    });

    it("should preserve benign SVG markup", () => {
      const benign = `<svg width="100" height="100"><rect x="0" y="0" width="50" height="50" fill="#5E6AD2" /></svg>`;
      expect(sanitizeSvg(benign)).toBe(benign);
    });
  });

  describe("API Rate Limiter (InMemoryRateLimiter)", () => {
    it("should allow requests under limit and block upon exceeding", () => {
      const testKey = "test-client-" + Date.now();
      // Allow 3 requests
      expect(rateLimiter.check(testKey, 3, 10000).allowed).toBe(true);
      expect(rateLimiter.check(testKey, 3, 10000).allowed).toBe(true);
      expect(rateLimiter.check(testKey, 3, 10000).allowed).toBe(true);
      // 4th request must be blocked
      const blocked = rateLimiter.check(testKey, 3, 10000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetInSeconds).toBeGreaterThan(0);
    });
  });
});
