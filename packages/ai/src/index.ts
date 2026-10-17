export * from "./ollamaClient";
export * from "./promptBuilder";
export * from "./citationValidator";
export * from "./modelProvider";
export * from "./providers/ollamaProvider";
export * from "./providers/openaiCompatibleProvider";
export * from "./providers/offlineProvider";

import { ModelProvider, ProviderConfig } from "./modelProvider";
import { OllamaProvider } from "./providers/ollamaProvider";
import { OpenAICompatibleProvider } from "./providers/openaiCompatibleProvider";
import { OfflineProvider } from "./providers/offlineProvider";

export function createModelProvider(config: ProviderConfig): ModelProvider {
  switch (config.type) {
    case "openai-compatible":
      if (!config.apiKey) {
        return new OfflineProvider();
      }
      return new OpenAICompatibleProvider({
        baseUrl: config.baseUrl || "https://api.openai.com/v1",
        apiKey: config.apiKey,
        defaultModel: config.model
      });
    case "ollama":
      return new OllamaProvider(config.baseUrl || "http://localhost:11434");
    case "offline":
    default:
      return new OfflineProvider();
  }
}
