# RepoPilot: Presentation Context Brief & Slide Blueprint
> **Optimized for [Gamma.app](https://gamma.app)**  
> *Instructions: Copy and paste this entire document directly into Gamma's "Text to Presentation" input. Gamma will parse the slide markers, headers, card grids, visual prompts, and metric callouts into an interactive, high-impact presentation deck.*

---

## Slide 1: Title & The Vision
**Headline:** RepoPilot: Codebase Intelligence & Spatial Architecture Explorer  
**Subhead:** The Zero-Hosted-Cost, Evidence-Backed Platform for Understanding Unfamiliar Code in Seconds  
**Presenter:** Mohit Yadav & The RepoPilot Core Team  
**Live Platform:** [repopilot.vercel.app](https://repopilot.vercel.app) | **Source:** [GitHub](https://github.com/Mohit-Rocky-25/RepoPilot)

**Key Callouts:**
- 100% Zero Cloud API Host Costs (Vercel Free Tier + Local/BYO AI)
- Deterministic Citations: Exact Commit SHA + File + Line Range Verification
- 133 Automated Tests Passing | Strict TypeScript | Monorepo Architecture

*Visual Suggestion for Gamma:* Deep obsidian dark mode backdrop (`#010102`) with glowing indigo/violet spatial network graph nodes and glowing code brackets.

---

## Slide 2: The Core Problem in Software Engineering
**Headline:** The "Code Exploration Abyss": Where 70% of Engineering Time Disappears  
**Subhead:** Developers don't spend most of their time writing code—they spend it deciphering existing systems.

**The 3 Major Industry Pain Points:**
1. **The Onboarding Tax**:
   - Joining a new team or exploring an open-source project requires days of reading disparate files, guessing execution flows, and deciphering obsolete documentation.
2. **The Cloud AI Bill & Privacy Trap**:
   - Commercial tools require expensive $20–$40/user/month subscriptions and upload proprietary intellectual property to remote cloud LLM servers.
3. **The AI Hallucination Hazard**:
   - Generic AI chatbots confidently invent functions, imaginary file paths, and outdated APIs that lead engineers down hours of debugging dead-ends.

*Key Stat Callout:* **70% of developer effort** is spent reading and navigating code, not writing it.

---

## Slide 3: The Solution — Introducing RepoPilot
**Headline:** An Evidence-First Developer Navigation Platform  
**Subhead:** Deterministic intelligence, interactive 3D spatial maps, and verified citations with zero mandatory cloud dependencies.

**What RepoPilot Delivers:**
- **Instant Ingestion**: Paste any public GitHub URL and analyze 1,000+ files in under 3 seconds using single-stream memory extraction.
- **Spatial Code Mapping**: Visualize complex system architecture as an interactive 2D planar and 3D perspective graph.
- **AST Symbol Discovery**: Extract functions, classes, and types across 7 languages using WebAssembly Tree-sitter parsers.
- **Zero-Hallucination AI**: Local open-weights AI (Ollama `qwen2.5-coder`) or Bring-Your-Own-Key with two-pass strict citation validation.
- **Automated Bug Triage**: Paste runtime stack traces to isolate culprit frames and generate syntax-valid unified pull request diffs.

---

## Slide 4: Architectural Breakthrough — The Zero-Hosted-Cost Operating Model
**Headline:** Enterprise Power, Zero Cloud Overhead  
**Subhead:** How RepoPilot eliminates cloud LLM bills and vector database hosting costs.

**Comparison Grid:**

| Traditional AI Code Assistants | RepoPilot Zero-Cost Architecture |
| :--- | :--- |
| Requires $500–$2,000/mo vector databases (Pinecone / Chroma) | **In-memory BM25 lexical engine** + Tree-sitter WASM running client-side |
| Requires recurring OpenAI/Anthropic API bills per query | **Local Ollama inference** (100% offline) or user-provided BYO keys |
| 1 API request per file (900 files = 900 GitHub requests) | **Single-stream `.tar.gz` extraction** (900 files in 1 HTTP call) |
| Proprietary code uploaded to 3rd-party servers | **Zero telemetry / Zero server-side persistence** |

*Quote Callout:* *"You can serve 10,000 developers on a free Vercel hobby tier without ever incurring an LLM invoice."*

---

## Slide 5: Core Feature 1 — Interactive 3D Spatial Architecture Graph
**Headline:** See Your Entire Codebase as a Living Spatial Constellation  
**Subhead:** Transform thousands of flat files into intuitive, interactive module clusters.

**Key Capabilities:**
- **Dual-Mode Canvas Engine**: Toggle seamlessly between high-clarity **2D Planar Mode** and immersive **3D Perspective Orbit**.
- **Deterministic Role Classification**: Color-coded node taxonomy:
  - 🟣 Violet: Configs & Manifests (`package.json`, `tsconfig.json`)
  - 🔵 Indigo: Core Application Entry Points (`page.tsx`, `main.go`, `index.ts`)
  - 🟢 Emerald: UI Components & Widgets
  - 🟡 Amber: Test Suites (`vitest`, `jest`, `pytest`)
  - ⚪ White: Root Repositories & Modules
- **Real Import Dependency Edges**: Dashed emerald vectors illustrate live import/export relationships between modules.
- **Architectural Module Briefs**: Click any node to inspect tracked files, module responsibilities, outgoing relations, and jump directly to source files.
- **Accessible List Alternative**: 100% WCAG-compliant keyboard-navigable tree for screen readers.

*Visual Suggestion for Gamma:* 3D network constellation with glowing node hubs and connecting dependency vectors.

---

## Slide 6: Core Feature 2 — High-Velocity Code Explorer & Symbol Indexer
**Headline:** Beyond Flat File Trees: Context-Aware Code Navigation  
**Subhead:** Instant file exploration with automatic ancestor expansion and AST symbol inspection.

**Feature Highlights:**
- **Smart Directory Overview Mode**:
  - Clicking any module folder (e.g. `src/components`) opens a rich directory card displaying file count, total size, language breakdown, and an interactive file list with 1-click inspect buttons.
- **Dynamic Hierarchy Auto-Expansion**:
  - Opening deeply nested files (e.g. `src/features/suite/credentials/engine/timelineEngine.ts`) automatically opens all ancestor folders in the tree so you never lose context.
- **WebAssembly AST Symbol Bar**:
  - Tree-sitter parses TypeScript, JavaScript, Python, Go, and Rust in real-time, mapping functions, classes, and interfaces directly to exact line spans.
- **Clickable Breadcrumb Trails**:
  - Instantly traverse up and down module hierarchies with single-click breadcrumbs.

---

## Slide 7: Core Feature 3 — Grounded AI Assistant with Zero Hallucinations
**Headline:** Answers You Can Verify Down to the Exact Line Coordinate  
**Subhead:** Two-pass citation validation guarantees that the AI never makes up files, functions, or logic.

**How the Evidence Loop Works:**
1. **User Prompt**: Developer asks a complex question about architecture or implementation.
2. **Deterministic Context Retrieval**: Local BM25 engine retrieves relevant file chunks bounded to exact token budgets.
3. **Prompt-Injection Sanitization**: Strict delimiters wrap untrusted repo content, preventing prompt injection attacks.
4. **Local / Private LLM Processing**: Queries local Ollama (`qwen2.5-coder:1.5b` or `7b`) or user-supplied keys.
5. **Two-Pass Citation Verification**: The engine verifies that every cited file, symbol, and line range exists in the active commit SHA before showing the response.
6. **Clickable Chips**: Citations render as interactive badges that jump straight to highlighted code lines.

*Metric Callout:* **0% Ghost Citations** — If a file or line doesn't exist in Git, the engine rejects the citation.

---

## Slide 8: Core Feature 4 — Automated Bug Investigator & Patch Generator
**Headline:** Turn Runtime Stack Traces into Validated Pull Request Diffes  
**Subhead:** Deterministic stack parsing paired with AST-aware unified diff generation.

**Investigation Workflow:**
- **Multi-Language Stack Trace Parser**:
  - Parses Python tracebacks, Go panics, Node.js V8 errors, and Java exceptions.
  - Automatically filters out noise from `node_modules/`, standard library internals, and framework middleware to highlight application code.
- **Automated Root-Cause Formulator**:
  - Hypothesizes the precise reason for failure (e.g. null pointer, out-of-bounds, unhandled promise).
- **Candidate Patch Synthesis**:
  - Generates unified PR diffs (`+` / `-`) formatted to standard Git patch specs.
- **Markdown PR Draft Generation**:
  - Produces an executive bug summary, affected files, proposed patch, and suggested regression test specifications ready to paste into GitHub.

---

## Slide 9: Technical Monorepo Architecture
**Headline:** Clean Separation of Concerns across 8 Isolated Packages  
**Subhead:** Engineered with modularity, zero circular dependencies, and strict type safety.

**Package Breakdown:**
- **`@repopilot/core`**: Canonical Zod schemas, validation contracts, and shared TypeScript interfaces.
- **`@repopilot/github`**: Single-tarball streaming, URL validation, and rate-limit accounting.
- **`@repopilot/indexer`**: WebAssembly Tree-sitter AST symbol extractor with heuristic regex fallback.
- **`@repopilot/search`**: Deterministic client-side BM25 context retrieval engine.
- **`@repopilot/analysis`**: Framework detector, directory role classifier, and 2D/3D spatial graph builder.
- **`@repopilot/ai`**: Provider-agnostic AI layer (Ollama, OpenAI-compatible, Offline deterministic fallback).
- **`@repopilot/debugging`**: Stack trace parser, vendor filter, hypothesis engine, and diff validator.
- **`@repopilot/execution`**: Sandboxed execution policy framework.

---

## Slide 10: Enterprise Security & Defensive Engineering
**Headline:** Bank-Grade Defensive Controls for Untrusted Repositories  
**Subhead:** Multi-layer defense protecting users against malicious GitHub archives and hostile payloads.

**Security Safeguards Implemented:**
- **Tarball Bomb & Traversal Defense**:
  - Strips path traversal (`../`, absolute paths, null bytes `%00`).
  - Strict decompression caps: 25MB archive maximum, 50MB decompressed ceiling, 1,500 file limit.
- **SVG & XSS Sanitization**:
  - Custom DOMParser and Regex sanitization blocks `<script>`, `onload`, `onerror`, `javascript:` URI vectors in exported diagrams.
- **Rate Limit Quota Protection**:
  - Token-bucket in-memory IP rate limiter defends endpoints (ingest, general, AI).
- **Safe Sandboxing**:
  - Untrusted repository code is never executed. Fixes are generated as inert text diffs for human developer review.

---

## Slide 11: Production Verification & Benchmarks
**Headline:** Proven, Tested, and Battle-Hardened  
**Subhead:** 133 automated test suites verifying every subsystem before launch.

**Live Metrics:**
- **133 / 133 Tests Passing** across 18 Vitest test suites (Unit, Integration, Security, E2E Smoke).
- **25 / 25 Next.js Routes** statically generated and verified with zero build regressions.
- **0 TypeScript Errors** (`tsc --noEmit` in strict mode).
- **0 ESLint Violations** across all pages and packages.
- **< 3s Ingestion Latency** for repositories with up to 1,000 files via tarball streaming.

---

## Slide 12: Roadmap, Impact & Getting Started
**Headline:** The Future of Open-Source Code Intelligence  
**Subhead:** Experience the live platform or deploy your own private instance in 1 click.

**What's Next on the Roadmap:**
- **Multi-Branch Diff Visualization**: Visual side-by-side branch comparisons.
- **Shiki Token-Level Syntax Coloring**: VS Code-grade vibrant syntax themes.
- **Local Git Repository Ingestion**: Drag-and-drop local `.git` folders without GitHub dependencies.

**Join the Project:**
- 🌐 **Live Web Application:** [https://repopilot.vercel.app](https://repopilot.vercel.app)
- 🐙 **GitHub Repository:** [Mohit-Rocky-25/RepoPilot](https://github.com/Mohit-Rocky-25/RepoPilot)
- 📜 **License:** Open Source under the MIT License
