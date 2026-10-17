import { ModelProvider, GenerateOptions } from "../modelProvider";

export class OfflineProvider implements ModelProvider {
  readonly type = "offline" as const;
  readonly name = "Offline (Deterministic Only)";

  async isAvailable(): Promise<{ available: boolean; error?: string; models?: string[] }> {
    return {
      available: true,
      models: ["deterministic-search-engine"]
    };
  }

  async generate(options: GenerateOptions): Promise<string> {
    return `### 🔍 Deterministic Offline Mode Active
Query: "${options.prompt}"

Neural synthesis is inactive. Results are retrieved using deterministic lexical and AST symbol ranking without cloud dependencies.`;
  }
}
