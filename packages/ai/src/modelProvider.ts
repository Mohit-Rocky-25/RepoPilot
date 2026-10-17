export type ProviderType = "ollama" | "openai-compatible" | "offline";

export interface GenerateOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ModelProvider {
  readonly type: ProviderType;
  readonly name: string;
  isAvailable(): Promise<{ available: boolean; error?: string; models?: string[] }>;
  generate(options: GenerateOptions): Promise<string>;
}

export interface ProviderConfig {
  type: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Sanitizes errors to ensure API keys are never leaked in error messages, stack traces, or responses.
 */
export function redactSecret(text: string, secret?: string): string {
  if (!secret || typeof secret !== "string" || secret.trim().length === 0) {
    return text;
  }
  const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "g"), "[REDACTED_API_KEY]");
}
