import { describe, it, expect } from "vitest";
import { sanitizeErrorMessage, sanitizeSvg } from "../../src/lib/security";
import nextConfig from "../../next.config.mjs";

describe("Task 5: Key and Token Handling & Security Headers", () => {
  describe("Redaction Across All Error Paths (Never Log Keys)", () => {
    it("redacts OpenAI and Anthropic API keys from error messages", () => {
      const openAiError = "API request failed with key sk-abcdef1234567890abcdef1234567890";
      const sanitizedOpenAi = sanitizeErrorMessage(openAiError);
      expect(sanitizedOpenAi).not.toContain("sk-abcdef1234567890abcdef1234567890");
      expect(sanitizedOpenAi).toContain("[REDACTED_API_KEY]");

      const anthropicError = "Anthropic rate limit: sk-ant-api03-abcdef1234567890abcdef1234567890-xyz";
      const sanitizedAnthropic = sanitizeErrorMessage(anthropicError);
      expect(sanitizedAnthropic).not.toContain("sk-ant-api03-abcdef");
      expect(sanitizedAnthropic).toContain("[REDACTED_API_KEY]");
    });

    it("redacts Google Gemini API keys from error messages", () => {
      const geminiError = "Google AI quota exhausted for key AIzaSyD1234567890AbCdEfGhIjKlMnOpQrStU";
      const sanitizedGemini = sanitizeErrorMessage(geminiError);
      expect(sanitizedGemini).not.toContain("AIzaSyD1234567890AbCdEfGhIjKlMnOpQrStU");
      expect(sanitizedGemini).toContain("[REDACTED_API_KEY]");
    });

    it("redacts GitHub Personal Access Tokens and Fine-grained PATs", () => {
      const ghpError = "GitHub Auth Error for ghp_0123456789abcdef0123456789abcdef0123";
      const sanitizedGhp = sanitizeErrorMessage(ghpError);
      expect(sanitizedGhp).not.toContain("ghp_0123456789abcdef");
      expect(sanitizedGhp).toContain("[REDACTED_TOKEN]");

      const patError = "GitHub fine-grained token expired: github_pat_11ABCDEF0123456789_abcdef0123456789";
      const sanitizedPat = sanitizeErrorMessage(patError);
      expect(sanitizedPat).not.toContain("github_pat_11ABCDEF");
      expect(sanitizedPat).toContain("[REDACTED_TOKEN]");
    });

    it("redacts Bearer tokens, query parameter secrets, and JSON key structures", () => {
      const bearerError = "Failed with Authorization: Bearer secret_bearer_token_12345";
      expect(sanitizeErrorMessage(bearerError)).toContain("Bearer [REDACTED]");
      expect(sanitizeErrorMessage(bearerError)).not.toContain("secret_bearer_token_12345");

      const queryError = "Failed request to https://api.example.com/v1?api_key=my_super_secret_key_123";
      expect(sanitizeErrorMessage(queryError)).not.toContain("my_super_secret_key_123");
      expect(sanitizeErrorMessage(queryError)).toContain("api_key=[REDACTED]");

      const jsonError = 'Client configuration failed: {"apiKey":"secret-credential-value-999"}';
      expect(sanitizeErrorMessage(jsonError)).not.toContain("secret-credential-value-999");
      expect(sanitizeErrorMessage(jsonError)).toContain('"apiKey":"[REDACTED]"');
    });
  });

  describe("Security Headers in next.config.mjs", () => {
    it("configures strict Content-Security-Policy with frame-ancestors none", async () => {
      const headersFn = nextConfig.headers as () => Promise<any[]>;
      const headersList = await headersFn();
      const allRoutes = headersList.find((h: any) => h.source === "/:path*");
      expect(allRoutes).toBeDefined();

      const headers = allRoutes?.headers || [];
      const csp = headers.find((h: any) => h.key === "Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp?.value).toContain("frame-ancestors 'none'");
      expect(csp?.value).toContain("default-src 'self'");
    });

    it("configures X-Content-Type-Options nosniff", async () => {
      const headersFn = nextConfig.headers as () => Promise<any[]>;
      const headersList = await headersFn();
      const allRoutes = headersList.find((h: any) => h.source === "/:path*");
      const contentType = allRoutes?.headers.find((h: any) => h.key === "X-Content-Type-Options");
      expect(contentType).toBeDefined();
      expect(contentType?.value).toBe("nosniff");
    });

    it("configures Referrer-Policy", async () => {
      const headersFn = nextConfig.headers as () => Promise<any[]>;
      const headersList = await headersFn();
      const allRoutes = headersList.find((h: any) => h.source === "/:path*");
      const referrer = allRoutes?.headers.find((h: any) => h.key === "Referrer-Policy");
      expect(referrer).toBeDefined();
      expect(referrer?.value).toBe("strict-origin-when-cross-origin");
    });

    it("verifies Mermaid & SVG rendering compatibility with CSP", () => {
      const sampleMermaidSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <g class="nodes">
            <rect x="10" y="10" width="80" height="30" fill="#5E6AD2" />
            <text x="20" y="30" fill="#ffffff">Architecture Node</text>
          </g>
        </svg>
      `;

      const sanitized = sanitizeSvg(sampleMermaidSvg);
      expect(sanitized).toContain("<svg");
      expect(sanitized).toContain("<rect");
      expect(sanitized).toContain("Architecture Node");
      // Malicious payload stripped
      const maliciousSvg = `<svg><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>`;
      expect(sanitizeSvg(maliciousSvg)).not.toContain("<script>");
      expect(sanitizeSvg(maliciousSvg)).toContain("<circle");
    });
  });
});
