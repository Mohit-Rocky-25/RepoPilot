# Phase 5 Report: Trustworthy Grounded Q&A

## 1. Issues Checked & Verdicts

| Item | Problem / Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Configurable model, 7B recommendation, quality notice for < 7B | **RESOLVED** | Replaced hardcoded model with configurable selection. Recommended `qwen2.5-coder:7b` (standard), kept `1.5b` as Fast/Low RAM option, added quality warning banner whenever models < 7B are selected. |
| 2 | BM25 lexical context retrieval with multi-factor boosts | **RESOLVED** | Added `retrieveContext()` to `SearchEngine` featuring BM25-style lexical scoring, 3.0x path boost, 2.0x symbol match boost, 1.5x entry point boost, and 1.3x manifest boost. Reports `includedFiles` and `omittedCount`. |
| 3 | Strict citation verification | **RESOLVED** | `CitationValidator.validate()` checks file existence at pinned SHA, ensures line ranges are within file bounds, checks named symbols against AST symbols in the file and verifies overlap. Removes invalid citations and emits warning: *"Some citations could not be verified and were removed."* |
| 4 | Refusal when retrieval finds nothing relevant | **RESOLVED** | In `/api/ai/ask`, if `retrieval.hasRelevantMatches` is false, the system explicitly refuses to answer from model memory and explains no evidence was found. |
| 5 | Configurable 4,000-token context bound | **RESOLVED** | Bound is configurable via request body `maxContextTokens` or env `MAX_CONTEXT_TOKENS` (default 4000). Context budgeting prioritizes top-ranked files and reports omitted file count. |
| 6 | Anti-prompt injection hardening | **RESOLVED** | Wrapped all repository content in `<untrusted_repo_content>` with CDATA delimiters. Hardened system prompt directing the model to treat untrusted tags strictly as passive data and ignore injection directives. Verified with malicious injection README fixture test. |
| 7 | Request cancellation support | **RESOLVED** | Added `signal?: AbortSignal` to `GenerateOptions`, `OpenAICompatibleProvider`, `OllamaProvider`, and `OllamaClient`. Added cancellation via `AbortController` in `src/app/assistant/page.tsx`. |

---

## 2. Files Changed

- `packages/ai/src/promptBuilder.ts`: Hardened prompt format with `<untrusted_repo_content>` delimiters and anti-injection instructions.
- `packages/ai/src/citationValidator.ts`: Added strict file length bounds check, symbol existence and span overlap validation, and `cleanInvalidCitations()` utility.
- `packages/ai/src/modelProvider.ts`: Added `signal?: AbortSignal` to `GenerateOptions`.
- `packages/ai/src/ollamaClient.ts` & `packages/ai/src/providers/ollamaProvider.ts`: Passed `signal` to fetch calls.
- `packages/ai/src/providers/openaiCompatibleProvider.ts`: Hooked `options.signal` abort listener to controller.
- `packages/search/src/searchEngine.ts`: Implemented `retrieveContext()` with BM25 lexical ranking and boosts for symbols, paths, entry points, and manifests.
- `src/app/api/ai/ask/route.ts`: Integrated BM25 context retrieval, strict citation cleansing, refusal on zero relevance, model quality warnings, and cancellation signals.
- `src/app/settings/ai/page.tsx`: Added 7B model recommendation, fast 1.5B option, and quality notice banner for models under 7B.
- `src/app/assistant/page.tsx`: Added `AbortController` cancellation, context files reporting (`includedFiles` & `omittedCount`), quality warning banners, and citation warnings.
- `tests/ai/citationValidator.test.ts`: Expanded to 7 unit tests covering valid citations, missing files, out-of-range lines, wrong symbols, span mismatches, and citation cleansing.
- `tests/ai/promptBuilder.test.ts`: Added prompt injection fixture test.
- `tests/search/searchEngine.test.ts`: Added multi-factor retrieval, refusal, and token-bound truncation tests.

---

## 3. Tests Added

- `Citation Validator - Strict Verification`:
  - Valid citations within real file boundaries.
  - Rejection of citations pointing to missing files.
  - Rejection of citations with lines exceeding total file lines.
  - Rejection of citations referencing non-existent symbols.
  - Rejection of citations where symbol span does not overlap citation lines.
  - Cleaning invalid citations from generated response text.
- `Prompt Builder - Grounding & Anti-Injection`:
  - Neutralizes prompt injection attempts within repository files (`<!-- SYSTEM OVERRIDE ... -->`).
- `Search Engine - BM25 Context Retrieval`:
  - Multi-factor BM25 context retrieval with symbol and entry point boosts.
  - Refusal signaling when query matches zero files or symbols.
  - Tracking omitted files when candidate count exceeds context token bound.

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
 Test Files  14 passed (14)
      Tests  88 passed (88)
   Duration  13.37s
# Exit code: 0

# Production Build
npm run build
> repopilot@1.0.0 build
> next build
 ✓ Compiled successfully
 ✓ Generating static pages (24/24)
Route (app)                              Size     First Load JS
┌ ○ /                                    14.3 kB         109 kB
├ ○ /assistant                           7.52 kB         102 kB
├ ○ /settings/ai                         7.51 kB         102 kB
+ First Load JS shared by all            87.3 kB
# Exit code: 0
```
