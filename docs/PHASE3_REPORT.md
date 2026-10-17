# Phase 3 Report: Real Symbol Extraction & Honest Naming

## 1. Issues Checked & Verdicts

| Item | Problem / Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Determine whether `@repopilot/indexer` uses a real parser or regex | **CONFIRMED** | Pre-Phase 3 `symbolExtractor.ts` used purely regular expressions with hardcoded `endLine: idx + 1` across all languages. |
| 2 | Switch to tree-sitter WASM with grammars for TS/TSX, JS, Python, Go, Rust | **RESOLVED** | Integrated `web-tree-sitter` and `tree-sitter-wasms`. Lazily loads grammars for `typescript`, `tsx`, `javascript`, `python`, `go`, and `rust`. |
| 3 | Fault tolerance & fallback | **RESOLVED** | Files with syntax errors do not break indexing; tree-sitter recovers surrounding valid AST nodes, and grammars falling back to pattern matching tag symbols with `confidence: 'heuristic'`. |
| 4 | Symbol varieties & multi-line spans | **RESOLVED** | Extracts functions, nested functions, arrow functions, classes, methods, interfaces, types, and exported constants with exact multi-line ranges (`startLine`, `endLine`) and signatures. |
| 5 | Honest naming | **RESOLVED** | The word "AST" is only used for symbols extracted from real AST parsing (`confidence: 'ast'`). Heuristic pattern extractions are explicitly tagged as `heuristic`. |

---

## 2. Files Changed

- `package.json` & `package-lock.json`: Added `web-tree-sitter` and `tree-sitter-wasms`.
- `packages/core/src/schemas.ts`: Updated `IndexedSymbolSchema` with `confidence: z.enum(["ast", "heuristic"]).optional()`.
- `packages/indexer/src/symbolExtractor.ts`:
  - `initTreeSitter()` with safe locateFile resolution.
  - `getLanguageGrammar(langKey)` lazy loading.
  - `extractFromAst()` AST traversal for TS/TSX/JS, Python, Go, Rust.
  - Robust multi-line block balance calculation in heuristic fallback.
  - `extractSymbols()` async entry point with fallback resilience.
  - `extractSymbolsSync()` and `extractSymbolsHeuristic()` synchronous helpers.
- `src/app/explore/page.tsx`:
  - Awaits async `extractSymbols()`.
  - Added confidence badge (`AST` vs `heuristic`) and full line ranges (`L{start}-L{end}`) to symbol pills.
  - Updated empty-state text to honestly describe "AST symbols with heuristic fallback".
- `tests/indexer/symbolExtractor.test.ts`: Replaced basic 2-test suite with comprehensive 8-test fixture suite across all target languages, edge cases, and fallback paths.

---

## 3. Tests Added

- `Symbol Extractor - TypeScript / JavaScript`:
  - Real line spans and AST confidence on functions, classes, interfaces, types.
  - Nested functions, arrow functions assigned to consts, decorators, async generators, and function overloads.
- `Symbol Extractor - Python`:
  - def, class, methods inside classes, nested functions, async functions, decorators.
- `Symbol Extractor - Go`:
  - functions, receiver methods, structs, interfaces, and constants.
- `Symbol Extractor - Rust`:
  - functions, structs, traits, enums, impl methods, and constants.
- `Symbol Extractor - Syntax Errors and Heuristic Fallback`:
  - Syntax errors resilience without crashing the index.
  - Explicit heuristic fallback tagging `confidence: 'heuristic'`.
  - Synchronous `extractSymbolsSync()` execution without throwing.

---

## 4. Verification Gate Output

```bash
# Typecheck
npm run typecheck
> repopilot@1.0.0 typecheck
> tsc --noEmit
# Exit code: 0

# Test Suite
npm test
> repopilot@1.0.0 test
> vitest run
 Test Files  13 passed (13)
      Tests  69 passed (69)
   Duration  3.84s
# Exit code: 0

# Production Build
npm run build
> repopilot@1.0.0 build
> next build
 ✓ Compiled successfully
 ✓ Generating static pages (24/24)
Route (app)                              Size     First Load JS
┌ ○ /                                    14.3 kB         109 kB
├ ○ /explore                             9.71 kB         104 kB
+ First Load JS shared by all            87.3 kB
# Exit code: 0
```
