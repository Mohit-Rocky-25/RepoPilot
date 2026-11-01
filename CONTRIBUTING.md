# Contributing to RepoPilot

Thank you for your interest in contributing to **RepoPilot**! RepoPilot is an open-source codebase intelligence, 3D architecture visualization, and evidence-grounded debugging platform built with **Next.js 14 App Router, TypeScript strict mode, Zod, and Vitest**.

We welcome contributions from software engineers, researchers, and open-source advocates worldwide.

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Please treat everyone with respect and kindness.

---

## 2. Development Setup

### Prerequisites
- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Git**

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/Mohit-Rocky-25/RepoPilot.git
cd RepoPilot

# 2. Install dependencies cleanly
npm ci

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Architecture & Monorepo Layout

RepoPilot organizes its core logic into focused packages under `packages/` with strict domain boundaries:

```
packages/
├── core/         # Core domain entities, interfaces, and Zod validation schemas
├── github/       # GitHub API client, SSRF-defended safeFetch, tarball extractor, token validator
├── indexer/      # Tree-sitter WASM AST symbol extractors (TS, JS, Py, Go, Rust, Java, C++, Kotlin)
├── search/       # Inverted index, identifier splitting (camelCase/snake_case), BM25 lexical search
├── analysis/     # Framework detection, entry point discovery, and 2D/3D spatial graph generation
├── ai/           # Bounded context prompt builder, Ollama provider, and 3-pass citation validator
├── debugging/    # Stack trace parser, candidate diff generator, lightweight TS type checker
└── execution/    # Execution policy enforcing untrusted repository sandboxing
```

The web application UI resides in `src/app/` using the Next.js 14 App Router.

---

## 4. Quality Gates & Testing Standards

All pull requests must pass automated CI checks. Before submitting a PR or pushing commits, run:

```bash
# 1. TypeScript Strict Typecheck
npm run typecheck

# 2. Next.js ESLint
npm run lint

# 3. Vitest Unit & Integration Suite
npm test

# 4. Secret & Credential Scanning
npm run security:scan

# 5. Playwright End-to-End Tests
npm run test:e2e
```

### Core Contribution Rules
1. **Never Break Existing Tests:** All 270+ test cases across all suites must pass.
2. **Add Tests for Every Behavior Change:** Every bug fix or new capability must include unit or integration tests that fail before the change and pass after.
3. **Honest Claims:** Documentation and UI claims must be strictly verified by automated tests. No claim may be stronger than what tests prove.
4. **Zero Untrusted Code Execution:** RepoPilot strictly treats third-party repository code as untrusted data. Never execute repository build scripts, test suites, or package install hooks on the server.
5. **Feature Flags for Large Features:** Large or experimental capabilities (e.g. GitHub App OAuth, multi-repo workspaces) must ship behind feature flags, disabled by default.
6. **SessionStorage for Secrets:** User credentials (tokens, API keys) must be stored exclusively in `sessionStorage` in the browser tab and never persisted in `localStorage` or server databases.

---

## 5. Commit & Pull Request Guidelines

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat(scope): add Java AST symbol extractor`
- `fix(security): reject SSRF DNS rebinding on redirect hops`
- `test(ai): add 3-pass citation support check test`
- `docs(readme): add known limitations section`

### Opening a Pull Request
1. Branch from `main`: `git checkout -b feat/your-feature-name`.
2. Commit in logical, well-tested units.
3. Verify all checks pass locally (`typecheck`, `lint`, `test`, `security:scan`).
4. Push your branch and open a Pull Request with a clear description of the problem, the solution, and tests added.
