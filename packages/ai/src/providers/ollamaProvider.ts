import { ModelProvider, GenerateOptions } from "../modelProvider";
import { OllamaClient } from "../ollamaClient";

export class OllamaProvider implements ModelProvider {
  readonly type = "ollama" as const;
  readonly name = "Local Ollama";
  private client: OllamaClient;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:11434") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.client = new OllamaClient(this.baseUrl);
  }

  async isAvailable(): Promise<{ available: boolean; error?: string; models?: string[] }> {
    const status = await this.client.checkStatus();
    return {
      available: status.isAvailable,
      error: status.error,
      models: status.models
    };
  }

  async generate(options: GenerateOptions): Promise<string> {
    return this.client.generate(
      options.model,
      options.prompt,
      options.systemPrompt,
      options.signal
    );
  }
}
