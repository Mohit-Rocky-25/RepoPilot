# RepoPilot — System Architecture & Technical Specifications

## 1. Executive Summary & Objectives

**RepoPilot** is an open-source codebase intelligence and developer productivity platform. Engineered for software engineers, open-source contributors, and researchers investigating unfamiliar repositories, RepoPilot provides an evidence-grounded workflow from repository ingestion to architectural mapping, code search, runtime error investigation, and pull request draft generation.

### Core Problems Addressed:
1. **Comprehending Unfamiliar Repositories**: Pinpoints framework entry points, active modules, configuration schemas, and package dependencies without requiring days of manual reading.
2. **Deterministic Code Navigation**: Provides fast file tree browsing, exact line number referencing, and AST-extracted symbol definitions (functions, classes, interfaces) across TypeScript, JavaScript, Python, Go, and Rust.
3. **Traceable Architecture Visualization**: Renders interactive 3D spatial maps and 2D planar fallbacks of modules and relationships derived from repository manifests and directory hierarchies.
4. **Evidence-Grounded Local AI**: Supports private, zero-cost conversational code intelligence via local Ollama models with verified source file citations, falling back to deterministic search when offline.
5. **Runtime Error Investigation**: Correlates runtime stack traces directly with source files, formulates ranked root-cause hypotheses, and drafts candidate minimal unified diffs.
6. **Reproducible PR Preparation**: Generates structured Markdown pull request drafts with verified regression test procedures for human review.

---

## 2. Hard Constraints & Operating Model

| Dimension | Policy | Technical Implementation |
| :--- | :--- | :--- |
| **Infrastructure Spend** | **₹0 / $0** | No required paid APIs, hosted vector databases, or recurring cloud compute bills. |
| **Repository Ingestion** | Public GitHub REST | Calls `/repos/{owner}/{repo}/git/trees/{sha}?recursive=1` with response header rate-limit tracking. |
| **Commit Pinning** | Immutable Revisions | Resolves default branch HEAD to an immutable commit SHA so citations remain permanently valid. |
| **Search Engine** | Deterministic Local | Client-side ranked search with symbol boosts, path scoring, and language filters without vector hallucination. |
| **Optional Inference** | Local Open-Weights | Connects to local Ollama (`http://localhost:11434`) running models such as `qwen2.5-coder:1.5b`. Fully operational offline. |
| **Execution Sandbox** | Safe Boundaries | Untrusted code is never executed automatically. Proposed patches are provided as unified diffs for human review. |

---

## 3. Visual Design System & Surface Hierarchy

RepoPilot implements a high-density, dark-themed developer workspace:
- **Canvas Base**: `#010102` deep obsidian black.
- **Surface Elevation**:
  - Surface 1: `#0F1011` (Primary application containers, cards, and sidebar)
  - Surface 2: `#141516` (Input fields, nested lists, secondary panels)
  - Surface 3: `#18191A` (Hover states, active card items)
  - Surface 4: `#191A1B` (Interactive controls, highlighted rows)
- **Border System**: 1px crisp dividers (`#23252A` subtle, `#34343A` default component borders, `#3E3E44` hover/active borders).
- **Single Brand Accent**: Restrained lavender-blue (`#5E6AD2`, hover `#828FFF`, active `#4D58B4`) reserved for primary actions, active navigation states, and focus rings.
- **Typography**: Clean sans-serif UI typography with tight letter spacing paired with monospace typography for commit SHAs, line numbers, file paths, and code snippets.

---

## 4. System Architecture & Directory Structure

```
RepoPilot/
├── src/
│   ├── app/                         # Next.js 14 App Router
│   │   ├── layout.tsx               # Root layout with RepositoryProvider & font configuration
│   │   ├── page.tsx                 # Landing page with pipeline overview & workflow demo
│   │   ├── architecture/page.tsx    # 3D Spatial Map & Architecture Evidence Brief
│   │   ├── explore/page.tsx         # Dual-pane directory tree & code viewer
│   │   ├── search/page.tsx          # Deterministic ranked symbol & text search
│   │   ├── assistant/page.tsx       # Evidence-grounded code assistant with verified citations
│   │   ├── debugging/page.tsx       # Stack trace parser & root-cause hypothesis analyzer
│   │   ├── patches/page.tsx         # Candidate patch review & PR draft export
│   │   ├── settings/page.tsx        # Token quotas & execution safety policies
│   │   ├── settings/ai/page.tsx     # Local Ollama diagnostics & model configuration
│   │   ├── docs/page.tsx            # Documentation, feature matrix & honest limitations
│   │   └── api/                     # API Route Handlers
│   │       ├── ai/ask/route.ts      # Bounded context prompt builder & citation verifier
│   │       ├── ai/status/route.ts   # Local Ollama daemon health & model probe
│   │       ├── architecture/route.ts# Framework & entry point detection engine
│   │       ├── debugging/analyze/   # Stack frame correlation & hypothesis generation
│   │       ├── github/file/route.ts # File content retrieval with size bounds
│   │       ├── github/import/       # Public repo ingestion & commit SHA resolver
│   │       └── search/route.ts      # Multi-modal ranked search endpoint
│   ├── components/
│   │   ├── architecture/            # ArchitectureMap3D (WebGL / Three.js)
│   │   ├── explorer/                # FileTree navigation
│   │   ├── layout/                  # ShellLayout, Sidebar, Header
│   │   ├── modals/                  # ImportModal, SearchModal (Command Palette)
│   │   └── ui/                      # Button, Card, Badge, Input, CodeViewer
│   ├── context/                     # RepositoryContext (State persistence across routes)
│   └── styles/                      # globals.css (Design tokens, dark scrollbars)
├── packages/                        # Domain Engines (Modular Monolith)
│   ├── core/                        # Strict Zod schemas & TypeScript domain contracts
│   ├── github/                      # Rate-limit-aware GitHub REST client & SSRF validator
│   ├── indexer/                     # Deterministic symbol extractor (TS, JS, Py, Go, Rust)
│   ├── search/                      # Ranked text & symbol search engine
│   ├── analysis/                    # Framework, entry point, & directory role detector
│   ├── ai/                          # Bounded Ollama client & citation validation engine
│   ├── debugging/                   # Stack trace parser & candidate diff generator
│   └── execution/                   # Sandbox safety policies & manual reproduction steps
├── docs/                            # Architecture documentation & decision records
└── tests/                           # Vitest unit & integration test suites
```

---

## 5. Security Architecture & Threat Model

1. **SSRF Boundary Enforcement**:
   - Every imported URL is validated against strict regex: `https://github.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)`.
   - Private IPv4/IPv6 ranges, loopback addresses (`127.0.0.1`, `localhost`), and cloud metadata IP addresses (`169.254.169.254`) are rejected before initiating network requests.
2. **Directory Traversal Mitigation**:
   - Internal file path lookups are validated against null bytes, directory navigation sequences (`..`), and absolute path indicators.
3. **Zero Automated Code Execution**:
   - Third-party repository code is treated as untrusted. RepoPilot never runs `npm install`, build scripts, or test runners automatically on the server.
   - All bug patches are formulated as unified diffs and verified locally by the developer.
4. **Client-Side Secret Isolation**:
   - Personal Access Tokens (PATs) configured for GitHub rate limit expansion remain exclusively inside browser `LocalStorage`. They are never stored in a server database or transmitted to third parties.

---

## 6. Verification & Quality Gates

The codebase enforces three automated verification gates:
1. **Type Safety**: `npm run typecheck` (`tsc --noEmit`) validates all components, hooks, and domain packages against TypeScript strict mode.
2. **Unit & Integration Testing**: `npm test` (`vitest run`) executes 27 unit tests across all 10 domain engines.
3. **Production Build**: `npm run build` verifies that all 20 Next.js routes compile and statically prerender cleanly.
