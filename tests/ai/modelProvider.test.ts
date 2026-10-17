import { describe, it, expect, vi } from "vitest";
import {
  createModelProvider,
  redactSecret,
  OfflineProvider,
  OpenAICompatibleProvider,
  OllamaProvider
} from "../../packages/ai/src";

describe("ModelProvider Abstraction & BYO-Key Security", () => {
  describe("redactSecret", () => {
    it("redacts API key from error strings", () => {
      const secretKey = "sk-proj-1234567890abcdef1234567890abcdef";
      const errorMsg = `HTTP 401 Unauthorized: Bearer ${secretKey} failed at https://api.openai.com/v1`;
      const sanitized = redactSecret(errorMsg, secretKey);

      expect(sanitized).not.toContain(secretKey);
      expect(sanitized).toContain("[REDACTED_API_KEY]");
    });

    it("handles keys with special regex characters safely", () => {
      const trickyKey = "sk+test$123.456*key?value";
      const errorMsg = `Error: Token ${trickyKey} invalid`;
      const sanitized = redactSecret(errorMsg, trickyKey);

      expect(sanitized).not.toContain(trickyKey);
      expect(sanitized).toBe("Error: Token [REDACTED_API_KEY] invalid");
    });

    it("returns original text if secret is empty or undefined", () => {
      expect(redactSecret("Simple error", undefined)).toBe("Simple error");
      expect(redactSecret("Simple error", "")).toBe("Simple error");
    });
  });

  describe("createModelProvider Factory", () => {
    it("creates an OllamaProvider for type 'ollama'", () => {
      const provider = createModelProvider({
        type: "ollama",
        baseUrl: "http://localhost:11434"
      });
      expect(provider.type).toBe("ollama");
      expect(provider.name).toBe("Local Ollama");
      expect(provider instanceof OllamaProvider).toBe(true);
    });

    it("creates an OpenAICompatibleProvider when API key is provided", () => {
      const provider = createModelProvider({
        type: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-mock-key-12345",
        model: "gpt-4o-mini"
      });
      expect(provider.type).toBe("openai-compatible");
      expect(provider.name).toContain("OpenAI-Compatible");
      expect(provider instanceof OpenAICompatibleProvider).toBe(true);
    });

    it("falls back to OfflineProvider if 'openai-compatible' is missing API key", () => {
      const provider = createModelProvider({
        type: "openai-compatible",
        baseUrl: "https://api.openai.com/v1"
        // missing apiKey
      });
      expect(provider.type).toBe("offline");
      expect(provider instanceof OfflineProvider).toBe(true);
    });

    it("creates an OfflineProvider for type 'offline'", () => {
      const provider = createModelProvider({ type: "offline" });
      expect(provider.type).toBe("offline");
      expect(provider.name).toContain("Offline");
      expect(provider instanceof OfflineProvider).toBe(true);
    });
  });

  describe("OfflineProvider", () => {
    it("is always available and generates deterministic response", async () => {
      const provider = new OfflineProvider();
      const status = await provider.isAvailable();
      expect(status.available).toBe(true);

      const output = await provider.generate({
        model: "deterministic",
        prompt: "Where is auth handled?"
      });
      expect(output).toContain("Deterministic Offline Mode Active");
    });
  });

  describe("OpenAICompatibleProvider Key Redaction", () => {
    it("never includes API key in thrown generation error", async () => {
      const secret = "sk-super-secret-12345";
      const provider = new OpenAICompatibleProvider({
        baseUrl: "https://invalid-non-existent-ai-provider.com/v1",
        apiKey: secret,
        timeoutMs: 150
      });

      await expect(
        provider.generate({
          model: "gpt-4o",
          prompt: "Hello"
        })
      ).rejects.toThrow();

      try {
        await provider.generate({ model: "gpt-4o", prompt: "Hello" });
      } catch (err: any) {
        expect(err.message).not.toContain(secret);
      }
    });

    it("reports not available when API key is missing", async () => {
      const provider = new OpenAICompatibleProvider({
        baseUrl: "https://api.openai.com/v1",
        apiKey: ""
      });
      const status = await provider.isAvailable();
      expect(status.available).toBe(false);
      expect(status.error).toContain("API key is required");
    });
  });
});
