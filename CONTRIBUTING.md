# Contributing to RepoPilot

Thank you for your interest in contributing to **RepoPilot**!

RepoPilot is an open-source codebase intelligence and developer productivity platform. We welcome contributions from developers, researchers, and open-source advocates of all experience levels.

---

## 🌟 Code of Conduct

We are committed to providing a welcoming, constructive, and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in the community.

---

## 🚀 Development Setup

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**: v9+ or v10+
- **Git**: Installed and configured
- *(Optional)* **Ollama**: For local open-weights coding model testing ([https://ollama.com](https://ollama.com))

### 2. Fork and Clone
```bash
# 1. Fork the repository on GitHub
# 2. Clone your personal fork
git clone https://github.com/<your-username>/RepoPilot.git
cd RepoPilot

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Quality Verification Suite

Before submitting any pull request, ensure all three quality gates pass with zero errors:

```bash
# 1. Typecheck: Verify strict TypeScript compilation
npm run typecheck

# 2. Tests: Run all unit and integration test suites
npm test

# 3. Build: Verify that all production routes compile
npm run build
```

---

## 📐 Engineering Guidelines & Principles

1. **Evidence-Grounded Intelligence**:
   - Any feature that references code or architecture must be grounded in actual indexed files and line numbers.
   - Do not display fabricated metrics, fake repository stars, or synthetic data.

2. **Deterministic Core & Zero Mandatory Fees**:
   - The core functionality (file browsing, search, AST symbol indexing, architecture mapping, stack trace parsing) must operate 100% offline without requiring paid third-party APIs.
   - AI features are strictly optional and rely on local open-weights models (via Ollama).

3. **Untrusted Code Security**:
   - Treat third-party repository code as untrusted. Never add automated scripts that execute user code, build manifests, or install scripts on the server.
   - Provide reproducible manual instructions and unified diffs instead.

4. **Design System Consistency**:
   - Adhere to the established design system:
     - Obsidian canvas: `#010102`
     - Elevated surfaces: `#0F1011` to `#191A1B`
     - Crisp 1px borders: `#23252A`, `#34343A`, `#3E3E44`
     - Restrained primary accent: `#5E6AD2`
     - Monospace typography for technical identifiers, hashes, and line coordinates.

---

## 📬 Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes using conventional commit messages:
   ```bash
   git commit -m "feat(indexer): add Kotlin AST symbol extractor"
   ```
3. Push your branch to GitHub:
   ```bash
   git push origin feat/your-feature-name
   ```
4. Open a Pull Request on GitHub against `main`. Fill out the pull request template with a clear explanation of what was changed and the testing verification performed.
