import type { AIProviderConfiguration } from "@repopilot/core";

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:11434") {
    // Strip trailing slashes
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async checkStatus(): Promise<{ isAvailable: boolean; models: string[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { isAvailable: false, models: [], error: `Ollama returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const models = Array.isArray(data.models)
        ? data.models.map((m: OllamaModelInfo) => m.name)
        : [];

      return { isAvailable: true, models };
    } catch (e: any) {
      return {
        isAvailable: false,
        models: [],
        error: "Could not connect to Ollama. Make sure Ollama is installed and running locally."
      };
    }
  }

  async generate(
    model: string,
    prompt: string,
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: 4096
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.response || "";
  }
}
