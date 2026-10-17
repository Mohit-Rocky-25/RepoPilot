import { ModelProvider, GenerateOptions, redactSecret } from "../modelProvider";

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  timeoutMs?: number;
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly type = "openai-compatible" as const;
  readonly name = "OpenAI-Compatible (BYO Key)";
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(options: OpenAICompatibleOptions) {
    let cleanUrl = (options.baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    this.baseUrl = cleanUrl;
    this.apiKey = (options.apiKey || "").trim();
    this.defaultModel = options.defaultModel || "gpt-4o-mini";
    this.timeoutMs = options.timeoutMs || 25000;
  }

  private getChatCompletionsUrl(): string {
    if (this.baseUrl.endsWith("/chat/completions")) {
      return this.baseUrl;
    }
    if (this.baseUrl.endsWith("/v1")) {
      return `${this.baseUrl}/chat/completions`;
    }
    return `${this.baseUrl}/v1/chat/completions`;
  }

  async isAvailable(): Promise<{ available: boolean; error?: string; models?: string[] }> {
    if (!this.apiKey) {
      return {
        available: false,
        error: "API key is required for OpenAI-compatible provider."
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const modelsUrl = this.baseUrl.endsWith("/v1")
        ? `${this.baseUrl}/models`
        : `${this.baseUrl}/v1/models`;

      const res = await fetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "RepoPilot-Client/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.status === 401) {
        return { available: false, error: "Invalid API key (401 Unauthorized)." };
      }

      if (!res.ok) {
        return {
          available: false,
          error: `Endpoint returned HTTP ${res.status}`
        };
      }

      const data = await res.json();
      const models = Array.isArray(data.data)
        ? data.data.map((m: any) => m.id).slice(0, 30)
        : [];

      return { available: true, models };
    } catch (err: any) {
      const msg = redactSecret(err.message || "Failed to reach AI endpoint", this.apiKey);
      return {
        available: false,
        error: msg
      };
    }
  }

  async generate(options: GenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Cannot generate: Missing API key.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: options.prompt });

    const targetUrl = this.getChatCompletionsUrl();

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "RepoPilot-Client/1.0"
        },
        body: JSON.stringify({
          model: options.model || this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 2048
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text();
        const safeError = redactSecret(errorText, this.apiKey);
        throw new Error(`OpenAI-compatible provider error (${res.status}): ${safeError.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content;
    } catch (err: any) {
      clearTimeout(timer);
      const safeMsg = redactSecret(err.message || "Request failed", this.apiKey);
      throw new Error(safeMsg);
    }
  }
}
