import { describe, it, expect, vi } from "vitest";
import {
  preloadGrammarForLanguage,
  getWasmStatus,
  onWasmStatusChange,
  extractSymbolsSync,
  extractSymbols,
  type WasmState
} from "../../packages/indexer/src/symbolExtractor";

describe("Task 3: Faster First Load via Grammar Preloading & Progress Tracking", () => {
  it("allows preloading grammar for the primary repository language", async () => {
    const states: WasmState[] = [];
    const unsubscribe = onWasmStatusChange((state) => {
      states.push(state);
    });

    const success = await preloadGrammarForLanguage("TypeScript");
    expect(success).toBe(true);

    const current = getWasmStatus();
    expect(current.status).toBe("ready");
    expect(current.language).toBe("typescript");

    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(states.some((s) => s.status === "warming" || s.status === "ready")).toBe(true);

    unsubscribe();
  });

  it("ensures synchronous regex fallback stays instant while or before WASM warms", () => {
    const tsCode = `
export class FastService {
  constructor(public config: string) {}
  public execute(): void {}
}
export interface FastConfig {}
`;
    const start = performance.now();
    const symbols = extractSymbolsSync("FastService.ts", tsCode, "TypeScript");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Instant execution under 50ms
    expect(symbols.length).toBeGreaterThanOrEqual(3);
    expect(symbols.every((s) => s.confidence === "heuristic")).toBe(true);
  });

  it("lazy-loads additional grammars on demand when new file types are encountered", async () => {
    const pyCode = `
class Worker:
    def process(self):
        pass
`;
    // Python has not been preloaded yet; extractSymbols lazily loads Python grammar
    const symbols = await extractSymbols("worker.py", pyCode, "Python");
    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(symbols.some((s) => s.name === "Worker" && s.kind === "class")).toBe(true);
    expect(symbols.some((s) => s.name === "process" && s.kind === "method")).toBe(true);
  });
});
