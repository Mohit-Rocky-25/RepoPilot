import { describe, it, expect } from "vitest";
import {
  extractSymbols,
  extractSymbolsHeuristic,
  extractSymbolsSync
} from "../../packages/indexer/src/symbolExtractor";

describe("Symbol Extractor - TypeScript / JavaScript", () => {
  it("extracts functions, classes, interfaces, and types with real line spans and AST confidence", async () => {
    const code = `
export function calculateVelocity(points: number, days: number): number {
  return points / days;
}

export class RepositoryManager {
  constructor(public repo: string) {}
}

export interface UserConfig {
  theme: string;
}

export type Status = "active" | "inactive";
`;

    const symbols = await extractSymbols("src/utils.ts", code, "TypeScript");

    expect(symbols.length).toBeGreaterThanOrEqual(4);

    const fn = symbols.find((s) => s.name === "calculateVelocity");
    expect(fn).toBeDefined();
    expect(fn?.kind).toBe("function");
    expect(fn?.startLine).toBe(2);
    expect(fn?.endLine).toBeGreaterThanOrEqual(2);
    expect(fn?.confidence).toBe("ast");

    const cls = symbols.find((s) => s.name === "RepositoryManager");
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe("class");
    expect(cls?.startLine).toBe(6);
    expect(cls?.endLine).toBeGreaterThanOrEqual(6);
    expect(cls?.confidence).toBe("ast");

    const iface = symbols.find((s) => s.name === "UserConfig");
    expect(iface).toBeDefined();
    expect(iface?.kind).toBe("interface");
    expect(iface?.startLine).toBe(10);
    expect(iface?.confidence).toBe("ast");

    const typ = symbols.find((s) => s.name === "Status");
    expect(typ).toBeDefined();
    expect(typ?.kind).toBe("type");
    expect(typ?.startLine).toBe(14);
    expect(typ?.confidence).toBe("ast");
  });

  it("extracts nested functions, arrow functions, decorators, async generators, and overloads", async () => {
    const code = `
export const API_LIMIT = 5000;

export class DataProcessor {
  @measureTime
  async processItems(batchId: string): Promise<number> {
    function calculateSubtotal(items: number[]): number {
      return items.reduce((a, b) => a + b, 0);
    }
    return calculateSubtotal([1, 2, 3]);
  }
}

export const fetchPage = async (page: number) => {
  return { page };
};

export async function* eventStream() {
  yield { id: 1 };
}

export function formatValue(val: string): string;
export function formatValue(val: number): string;
export function formatValue(val: any): string {
  return String(val);
}
`;

    const symbols = await extractSymbols("src/processor.ts", code, "TypeScript");

    // Exported constant
    const constant = symbols.find((s) => s.name === "API_LIMIT");
    expect(constant).toBeDefined();
    expect(constant?.kind).toBe("constant");

    // Class and method
    const cls = symbols.find((s) => s.name === "DataProcessor");
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe("class");

    const method = symbols.find((s) => s.name === "processItems");
    expect(method).toBeDefined();
    expect(method?.kind).toBe("method");

    // Nested function
    const nested = symbols.find((s) => s.name === "calculateSubtotal");
    expect(nested).toBeDefined();
    expect(nested?.kind).toBe("function");

    // Arrow function assigned to const
    const arrow = symbols.find((s) => s.name === "fetchPage");
    expect(arrow).toBeDefined();
    expect(arrow?.kind).toBe("function");

    // Async generator
    const generator = symbols.find((s) => s.name === "eventStream");
    expect(generator).toBeDefined();
    expect(generator?.kind).toBe("function");

    // Overload functions
    const overloads = symbols.filter((s) => s.name === "formatValue");
    expect(overloads.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Symbol Extractor - Python", () => {
  it("extracts def, class, methods, decorators, and async functions with AST confidence", async () => {
    const pyCode = `
@singleton
class DataPipeline:
    def __init__(self, name):
        self.name = name

    def process_records(self, data):
        def validate(record):
            return record is not None
        return [r for r in data if validate(r)]

@timed
async def fetch_remote_metrics(endpoint: str):
    pass
`;

    const symbols = await extractSymbols("pipeline.py", pyCode, "Python");

    const cls = symbols.find((s) => s.name === "DataPipeline");
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe("class");
    expect(cls?.startLine).toBeGreaterThanOrEqual(2);
    expect(cls?.endLine).toBeGreaterThan(cls?.startLine || 0);
    expect(cls?.confidence).toBe("ast");

    const method = symbols.find((s) => s.name === "process_records");
    expect(method).toBeDefined();
    expect(method?.kind).toBe("method");
    expect(method?.confidence).toBe("ast");

    const nested = symbols.find((s) => s.name === "validate");
    expect(nested).toBeDefined();

    const asyncFn = symbols.find((s) => s.name === "fetch_remote_metrics");
    expect(asyncFn).toBeDefined();
    expect(asyncFn?.kind).toBe("function");
    expect(asyncFn?.confidence).toBe("ast");
  });
});

describe("Symbol Extractor - Go", () => {
  it("extracts functions, receiver methods, structs, interfaces, and constants", async () => {
    const goCode = `
package main

const MaxIdleConnections = 20

type Router interface {
    Route(path string) error
}

type Server struct {
    port int
}

func (s *Server) ListenAndServe() error {
    return nil
}

func NewServer(port int) *Server {
    return &Server{port: port}
}
`;

    const symbols = await extractSymbols("server.go", goCode, "Go");

    const constant = symbols.find((s) => s.name === "MaxIdleConnections");
    expect(constant).toBeDefined();
    expect(constant?.kind).toBe("constant");

    const iface = symbols.find((s) => s.name === "Router");
    expect(iface).toBeDefined();
    expect(iface?.kind).toBe("interface");

    const struct = symbols.find((s) => s.name === "Server");
    expect(struct).toBeDefined();
    expect(struct?.kind).toBe("class");

    const method = symbols.find((s) => s.name === "ListenAndServe");
    expect(method).toBeDefined();
    expect(method?.kind).toBe("method");

    const fn = symbols.find((s) => s.name === "NewServer");
    expect(fn).toBeDefined();
    expect(fn?.kind).toBe("function");
  });
});

describe("Symbol Extractor - Rust", () => {
  it("extracts functions, structs, traits, enums, impl methods, and constants", async () => {
    const rustCode = `
pub const MAX_BUFFER_SIZE: usize = 1024;

pub struct BufferPool {
    size: usize,
}

pub enum PoolStatus {
    Ready,
    Exhausted,
}

pub trait Allocator {
    fn allocate(&self) -> bool;
}

impl Allocator for BufferPool {
    fn allocate(&self) -> bool {
        true
    }
}

pub fn initialize_pool() -> BufferPool {
    BufferPool { size: 1024 }
}
`;

    const symbols = await extractSymbols("pool.rs", rustCode, "Rust");

    const constant = symbols.find((s) => s.name === "MAX_BUFFER_SIZE");
    expect(constant).toBeDefined();
    expect(constant?.kind).toBe("constant");

    const struct = symbols.find((s) => s.name === "BufferPool");
    expect(struct).toBeDefined();
    expect(struct?.kind).toBe("class");

    const enm = symbols.find((s) => s.name === "PoolStatus");
    expect(enm).toBeDefined();
    expect(enm?.kind).toBe("type");

    const traitSymbol = symbols.find((s) => s.name === "Allocator");
    expect(traitSymbol).toBeDefined();
    expect(traitSymbol?.kind).toBe("interface");

    const method = symbols.find((s) => s.name === "allocate");
    expect(method).toBeDefined();
    expect(method?.kind).toBe("method");

    const fn = symbols.find((s) => s.name === "initialize_pool");
    expect(fn).toBeDefined();
    expect(fn?.kind).toBe("function");
  });
});

describe("Symbol Extractor - Syntax Errors and Heuristic Fallback", () => {
  it("does not fail on syntax errors and recovers symbols", async () => {
    const brokenCode = `
export function validBeforeError() {
  return true;
}

export function brokenSyntax( {
  let x = ;

export class ValidClassAfterError {
  render() {}
}
`;

    // Must not throw error
    const symbols = await extractSymbols("broken.ts", brokenCode, "TypeScript");
    expect(Array.isArray(symbols)).toBe(true);
    expect(symbols.length).toBeGreaterThan(0);
    // Finds valid symbols surrounding the broken syntax
    expect(symbols.some((s) => s.name === "validBeforeError")).toBe(true);
  });

  it("supports explicit heuristic extraction tagging confidence as heuristic", () => {
    const code = `
function calculateVelocity(points: number, days: number): number {
  return points / days;
}

class Manager {
  log() {}
}
`;
    const heuristicSymbols = extractSymbolsHeuristic("src/fast.ts", code, "TypeScript");
    expect(heuristicSymbols.length).toBeGreaterThan(0);
    for (const sym of heuristicSymbols) {
      expect(sym.confidence).toBe("heuristic");
    }
  });

  it("extractSymbolsSync uses heuristic extraction without throwing", () => {
    const code = `
def add_numbers(a, b):
    return a + b
`;
    const symbols = extractSymbolsSync("math.py", code, "Python");
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("add_numbers");
    expect(symbols[0].confidence).toBe("heuristic");
  });
});
