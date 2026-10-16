# Changelog

All notable changes to **RepoPilot** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-17

### Added
- **Interactive 3D Spatial Architecture Visualization**:
  - WebGL orbital perspective map (`/architecture`) using Three.js with orbit, pan, zoom, node selection, and dependency highlighting.
  - 2D Planar fallback mode for instant rendering on lower-power devices.
  - Automatic framework detection (Next.js, React, Express, FastAPI, Flask, etc.) and entry point discovery from repository manifests.
- **Precision Developer Design System**:
  - High information density dark UI with obsidian canvas (`#010102`), four-tiered surface elevation (`#0F1011` to `#191A1B`), crisp 1px borders (`#23252A`, `#34343A`, `#3E3E44`), and a restrained lavender-blue accent (`#5E6AD2`).
  - Dark-mode code viewer with syntax highlighting, exact line numbers, and active line highlighting.
- **Deterministic Code Navigation & Search**:
  - Dual-pane file explorer (`/explore`) with resizable tree navigation.
  - Multi-modal ranked code search (`/search`) with path matching, symbol boosts, and language filters.
  - Deterministic AST symbol extraction for TypeScript, JavaScript, Python, Go, and Rust.
- **Evidence-Grounded Code Assistant**:
  - Local AI integration (`/assistant`) connecting to local Ollama (`http://localhost:11434`) with bounded prompt contexts.
  - Automated citation verifier validating returned file paths and line ranges against real repository files.
  - 100% offline deterministic fallback mode when local Ollama is offline.
- **Bug Investigation & Patch Review Handoff**:
  - Runtime exception stack trace parser (`/debugging`) mapping error frames to repository source files.
  - Ranked root-cause hypotheses engine formulating testable explanations.
  - Active investigation handoff to Patch Review (`/patches`) with unified diff viewer, regression test checklist, and exportable Markdown pull request drafts.
- **Security & Privacy Sandbox**:
  - Strict SSRF protection rejecting non-GitHub hosts and private IP addresses.
  - Path traversal protection validating repository file lookups.
  - Zero automated code execution policy preventing arbitrary third-party script execution.
  - Client-side token storage keeping GitHub PATs purely in browser `LocalStorage`.

---

## [0.9.0] - 2026-10-16

### Added
- Initial modular monolith architecture with domain packages (`@repopilot/core`, `@repopilot/github`, `@repopilot/indexer`, `@repopilot/search`, `@repopilot/analysis`, `@repopilot/ai`, `@repopilot/debugging`, `@repopilot/execution`).
- Vitest test suite with 27 unit and integration tests across all domain engines.
- Public GitHub REST API integration with rate-limit tracking and commit revision pinning.
