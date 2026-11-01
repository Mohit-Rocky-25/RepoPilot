import { describe, it, expect } from "vitest";
import {
  ALLOWED_GITHUB_HOSTS,
  isAllowedGitHubHost,
  safeGitHubFetch,
  isPrivateOrReservedIp
} from "../../src/lib/security";

describe("Task 1: SSRF Defense Allowlist & Anti-Rebinding", () => {
  describe("Host Allowlist Enforcement", () => {
    it("strictly allows only github.com, api.github.com, and codeload.github.com", () => {
      expect(ALLOWED_GITHUB_HOSTS.has("github.com")).toBe(true);
      expect(ALLOWED_GITHUB_HOSTS.has("api.github.com")).toBe(true);
      expect(ALLOWED_GITHUB_HOSTS.has("codeload.github.com")).toBe(true);
      expect(ALLOWED_GITHUB_HOSTS.size).toBe(3);

      expect(isAllowedGitHubHost("https://github.com/owner/repo")).toBe(true);
      expect(isAllowedGitHubHost("https://api.github.com/repos")).toBe(true);
      expect(isAllowedGitHubHost("https://codeload.github.com/tarball")).toBe(true);

      // Rejects everything else
      expect(isAllowedGitHubHost("https://raw.githubusercontent.com/file")).toBe(false);
      expect(isAllowedGitHubHost("https://gitlab.com/owner/repo")).toBe(false);
      expect(isAllowedGitHubHost("https://evil.com")).toBe(false);
      expect(isAllowedGitHubHost("https://169.254.169.254")).toBe(false);
      expect(isAllowedGitHubHost("http://localhost:11434")).toBe(false);
    });

    it("rejects non-allowlisted hosts before making any network call", async () => {
      await expect(
        safeGitHubFetch("https://evil-attacker.com/steal-token")
      ).rejects.toThrow(/not in the allowlist/i);

      await expect(
        safeGitHubFetch("https://gitlab.com/api/v4/projects")
      ).rejects.toThrow(/not in the allowlist/i);

      await expect(
        safeGitHubFetch("https://raw.githubusercontent.com/malicious/repo/main/code.js")
      ).rejects.toThrow(/not in the allowlist/i);
    });
  });

  describe("DNS Rebinding & IP Blocklist Defense", () => {
    it("detects and blocks simulated DNS rebinding to internal loopback IP", async () => {
      // Simulates a DNS resolution returning 127.0.0.1 for an allowlisted hostname
      const simulatedRebindingDns = async () => [
        { address: "127.0.0.1", family: 4 }
      ];

      await expect(
        safeGitHubFetch("https://api.github.com/user", {
          dnsLookup: simulatedRebindingDns
        })
      ).rejects.toThrow(/resolved to restricted IP.*127\.0\.0\.1/i);
    });

    it("detects and blocks simulated DNS rebinding to cloud metadata IP", async () => {
      const simulatedCloudMetadataDns = async () => [
        { address: "169.254.169.254", family: 4 }
      ];

      await expect(
        safeGitHubFetch("https://codeload.github.com/tarball", {
          dnsLookup: simulatedCloudMetadataDns
        })
      ).rejects.toThrow(/resolved to restricted IP.*169\.254\.169\.254/i);
    });

    it("detects and blocks octal, hex, and decimal IP representations in blocklist layer", () => {
      // Octal representations
      expect(isPrivateOrReservedIp("0177.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("0177.1")).toBe(true);
      expect(isPrivateOrReservedIp("0251.0376.0251.0376")).toBe(true); // 169.254.169.254 in octal

      // Hex representations
      expect(isPrivateOrReservedIp("0x7f000001")).toBe(true);
      expect(isPrivateOrReservedIp("0xa9fea9fe")).toBe(true); // 169.254.169.254 in hex
      expect(isPrivateOrReservedIp("0x7f.0x0.0x0.0x1")).toBe(true);

      // Decimal integer representations
      expect(isPrivateOrReservedIp("2130706433")).toBe(true); // 127.0.0.1
      expect(isPrivateOrReservedIp("2852039166")).toBe(true); // 169.254.169.254
      expect(isPrivateOrReservedIp("167772161")).toBe(true);  // 10.0.0.1
    });

    it("detects and blocks IPv4-mapped IPv6 addresses", () => {
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedIp("0:0:0:0:0:ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("0:0:0:0:0:ffff:169.254.169.254")).toBe(true);
    });
  });

  describe("Manual Redirect Handling & Validation per Hop", () => {
    it("blocks redirects to non-allowlisted external hostnames", async () => {
      // Create mock response simulating a 302 redirect from api.github.com to evil.com
      const mockDns = async () => [{ address: "93.184.216.34", family: 4 }];

      // We simulate fetch encountering a 302 redirect
      let hopCount = 0;
      const testDnsLookup = async (host: string) => {
        hopCount++;
        return [{ address: "93.184.216.34", family: 4 }];
      };

      // When redirect location is https://attacker.com/evil, it must fail at hop 2 before network call
      await expect(
        safeGitHubFetch("https://api.github.com/redirect-to-attacker", {
          dnsLookup: testDnsLookup,
          allowHttpForTesting: false,
          // Custom interceptor simulating response
          customTransport: async (url) => {
            if (url.includes("redirect-to-attacker")) {
              return new Response(null, {
                status: 302,
                headers: { location: "https://attacker.com/pwned" }
              });
            }
            return new Response("ok", { status: 200 });
          }
        })
      ).rejects.toThrow(/not in the allowlist/i);
    });

    it("blocks redirects to internal private IPs", async () => {
      await expect(
        safeGitHubFetch("https://api.github.com/redirect-to-metadata", {
          dnsLookup: async () => [{ address: "93.184.216.34", family: 4 }],
          customTransport: async () => {
            return new Response(null, {
              status: 302,
              headers: { location: "https://169.254.169.254/latest/meta-data" }
            });
          }
        })
      ).rejects.toThrow(/not in the allowlist|restricted IP/i);
    });

    it("enforces max 3 redirects limit and aborts on the 4th redirect", async () => {
      let redirectHops = 0;
      await expect(
        safeGitHubFetch("https://api.github.com/hop-0", {
          dnsLookup: async () => [{ address: "93.184.216.34", family: 4 }],
          customTransport: async (url) => {
            redirectHops++;
            return new Response(null, {
              status: 302,
              headers: { location: `https://api.github.com/hop-${redirectHops}` }
            });
          }
        })
      ).rejects.toThrow(/Maximum redirect limit \(3\) exceeded/i);

      expect(redirectHops).toBe(4); // 0 -> 1 -> 2 -> 3 -> aborts at hop 4
    });
  });
});
