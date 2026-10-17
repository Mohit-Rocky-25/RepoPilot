import { describe, it, expect } from "vitest";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  validateOllamaEndpoint,
  validateAiEndpoint,
  isPrivateOrReservedIp,
  sanitizeErrorMessage,
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

    it("should reject identifiers exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      expect(validateGitHubOwner(longName)).toBe(false);
      expect(validateGitHubRepo(longName)).toBe(false);
      expect(validateGitHubOwner("a".repeat(100))).toBe(true);
    });

    it("should reject unicode lookalikes and homoglyphs", () => {
      // Cyrillic 'а' (\u0430) instead of ASCII 'a'
      expect(validateGitHubOwner("\u0430dmin")).toBe(false);
      // Fullwidth Latin characters
      expect(validateGitHubOwner("\uFF4D\uFF4F\uFF48\uFF49\uFF54")).toBe(false);
      // Emojis
      expect(validateGitHubRepo("my-\uD83D\uDE80-repo")).toBe(false);
    });

    it("should allow valid GitHub handles and repository names", () => {
      expect(validateGitHubOwner("Mohit-Rocky-25")).toBe(true);
      expect(validateGitHubRepo("RepoPilot")).toBe(true);
      expect(validateGitHubRepo("next.js")).toBe(true);
      expect(validateGitHubRepo("react_native")).toBe(true);
    });
  });

  describe("Comprehensive Path Traversal Defense (validateFilePath)", () => {
    it("should reject standard directory traversal sequences", () => {
      expect(validateFilePath("../secret.txt")).toBe(false);
      expect(validateFilePath("foo/../../secret.txt")).toBe(false);
      expect(validateFilePath("..")).toBe(false);
    });

    it("should reject backslash traversal sequences", () => {
      expect(validateFilePath("..\\secret.txt")).toBe(false);
      expect(validateFilePath("foo\\..\\bar")).toBe(false);
    });

    it("should reject single URL-encoded traversal patterns", () => {
      expect(validateFilePath("%2e%2e%2fsecret.txt")).toBe(false);
      expect(validateFilePath("%2e%2e/secret.txt")).toBe(false);
      expect(validateFilePath("..%2fsecret.txt")).toBe(false);
      expect(validateFilePath("%2e%2e%5csecret.txt")).toBe(false);
    });

    it("should reject double URL-encoded traversal patterns", () => {
      expect(validateFilePath("%252e%252e%252fsecret.txt")).toBe(false);
      expect(validateFilePath("%252e%252e%255csecret.txt")).toBe(false);
    });

    it("should reject null bytes in literal and URL-encoded forms", () => {
      expect(validateFilePath("secret.txt\0.png")).toBe(false);
      expect(validateFilePath("secret.txt%00.png")).toBe(false);
    });

    it("should reject absolute paths across Windows and Unix conventions", () => {
      expect(validateFilePath("/etc/passwd")).toBe(false);
      expect(validateFilePath("C:\\Windows\\System32\\cmd.exe")).toBe(false);
      expect(validateFilePath("c:/windows/system32")).toBe(false);
      expect(validateFilePath("\\\\network\\share\\file.txt")).toBe(false);
    });

    it("should allow valid repository relative paths", () => {
      expect(validateFilePath("src/index.ts")).toBe(true);
      expect(validateFilePath("packages/ai/src/modelProvider.ts")).toBe(true);
      expect(validateFilePath("README.md")).toBe(true);
      expect(validateFilePath(".github/workflows/ci.yml")).toBe(true);
    });
  });

  describe("SSRF Defense & Numeric IP Encodings (isPrivateOrReservedIp & validateAiEndpoint)", () => {
    it("should detect all numeric, hex, and octal loopback IP encodings", () => {
      // Decimal 2130706433 -> 127.0.0.1
      expect(isPrivateOrReservedIp("2130706433")).toBe(true);
      // Hex 0x7f000001 -> 127.0.0.1
      expect(isPrivateOrReservedIp("0x7f000001")).toBe(true);
      // Dotted hex 0x7f.0.0.1 & 0x7f.1
      expect(isPrivateOrReservedIp("0x7f.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("0x7f.1")).toBe(true);
      // Octal 0177.0.0.1 & 0177.1
      expect(isPrivateOrReservedIp("0177.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("0177.1")).toBe(true);
      // Shorthand 127.1
      expect(isPrivateOrReservedIp("127.1")).toBe(true);
    });

    it("should detect numeric and hex cloud metadata IP encodings", () => {
      // Decimal 2852039166 -> 169.254.169.254
      expect(isPrivateOrReservedIp("2852039166")).toBe(true);
      // Hex 0xa9fea9fe -> 169.254.169.254
      expect(isPrivateOrReservedIp("0xa9fea9fe")).toBe(true);
    });

    it("should detect IPv4-mapped IPv6 loopback and metadata addresses", () => {
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("0:0:0:0:0:ffff:127.0.0.1")).toBe(true);
    });

    it("should detect localhost hostname variants in validateAiEndpoint", async () => {
      expect((await validateAiEndpoint("https://localhost.localdomain/v1")).valid).toBe(false);
      expect((await validateAiEndpoint("https://ip6-localhost/v1")).valid).toBe(false);
      expect((await validateAiEndpoint("https://0.0.0.0:11434")).valid).toBe(false);
    });

    it("should allow standard public remote IPs and hostnames", () => {
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIp("104.244.42.1")).toBe(false);
    });
  });

  describe("ReDoS Resilience & Size Caps (StackTraceParser)", () => {
    it("should enforce a 64 KB cap and process 100 KB trace in under 50ms", async () => {
      const { StackTraceParser } = await import("@repopilot/debugging");
      // Generate 100 KB adversarial repetitive trace
      const largeTrace = "    at processLine (C:\\path\\to\\file.ts:12:34)\n".repeat(2500); // ~110 KB
      expect(largeTrace.length).toBeGreaterThan(65536);

      const startTime = performance.now();
      const parsed = StackTraceParser.parse(largeTrace);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      expect(parsed.frames.length).toBeGreaterThan(0);
    });
  });

  describe("Error Sanitization & Secret Leak Prevention (sanitizeErrorMessage)", () => {
    it("should strip absolute filesystem paths and secrets from error strings", () => {
      const leakedWindows = "Error in C:\\Users\\admin\\project\\server.ts: line 42";
      expect(sanitizeErrorMessage(leakedWindows)).not.toContain("C:\\Users\\admin\\project");
      expect(sanitizeErrorMessage(leakedWindows)).toContain("[REDACTED_PATH]");

      const leakedUnix = "Crash in /home/deploy/app/secret.ts: fatal";
      expect(sanitizeErrorMessage(leakedUnix)).not.toContain("/home/deploy");
      expect(sanitizeErrorMessage(leakedUnix)).toContain("[REDACTED_PATH]");

      const leakedToken = "Failed to fetch: ghp_1234567890abcdef1234567890abcdef1234";
      expect(sanitizeErrorMessage(leakedToken)).not.toContain("ghp_1234567890abcdef");
      expect(sanitizeErrorMessage(leakedToken)).toContain("[REDACTED_TOKEN]");

      const leakedBearer = "Authorization header Bearer secret-auth-token-12345 failed";
      expect(sanitizeErrorMessage(leakedBearer)).not.toContain("secret-auth-token-12345");
      expect(sanitizeErrorMessage(leakedBearer)).toContain("Bearer [REDACTED]");
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
