# Multi-Repository Workspace Architectural Specification

**Status:** Architectural Design Only (Not Implemented)  
**Feature Flag:** `ENABLE_MULTI_REPO=false`  
**Target:** RepoPilot Core & Search Engine v2.0  

---

## 1. Executive Summary

Modern enterprise software systems rarely live in a single repository. Microservice ecosystems, client-server architectures, and modular monorepos broken across multiple GitHub repositories require cross-boundary code navigation, symbol resolution, and unified semantic reasoning.

This document specifies the technical design for extending RepoPilot from a single-repository intelligence engine to a **multi-repository workspace platform**, addressing index partitioning, cross-repo symbol resolution, SCIP/LSIF protocols, memory budgeting, and an incremental rollout plan.

---

## 2. Multi-Repository Workspace Index Model

### 2.1 Workspace Data Hierarchy

A multi-repo workspace is defined as a cohesive collection of pinned repositories:

```ts
export interface WorkspaceDescriptor {
  id: string; // UUID v4 or slug (e.g. "acme-ecommerce-system")
  name: string;
  createdAt: string;
  repositories: WorkspaceRepositoryRef[];
}

export interface WorkspaceRepositoryRef {
  owner: string;
  repo: string;
  pinnedSha: string;
  isPrimary: boolean; // Main entrypoint or active focus
  alias?: string;     // Friendly name (e.g. "@api", "@frontend", "@shared-types")
  dependencyManifests: {
    packageNames: string[]; // e.g. ["@acme/core-sdk", "@acme/types"]
    modulePaths: string[];  // e.g. ["github.com/acme/backend/proto"]
  };
}
```

### 2.2 Index Partitioning & Storage Layout

To avoid memory bloat and catastrophic re-indexing on every commit, RepoPilot adopts a **Federated Sharded Index Model**:

```
+---------------------------------------------------------------------------------+
|                         Workspace Virtual Index Manager                         |
|                                                                                 |
|  +------------------------------+             +------------------------------+  |
|  |     Repo A Shard Index       |             |     Repo B Shard Index       |  |
|  | (frontend@sha1)              |             | (backend@sha2)               |  |
|  | - File Tree                  |             | - File Tree                  |  |
|  | - Inverted Trigram / BM25    |             | - Inverted Trigram / BM25    |  |
|  | - Symbol Definitions Table   |             | - Symbol Definitions Table   |  |
|  +------------------------------+             +------------------------------+  |
|                 \                                     /                         |
|                  +-----------------------------------+                          |
|                  |   Cross-Repo Symbol Linking Graph |                          |
|                  | (Export Map -> Import Resolution) |                          |
|                  +-----------------------------------+                          |
+---------------------------------------------------------------------------------+
```

- **Shard Isolation:** Each repository is indexed independently keyed by `${owner}/${repo}@${commitSha}`. When Repo A receives a new commit, Repo B's cached shard index remains completely unaffected.
- **Uniform URI Namespace:** Symbols and file paths are addressed by global canonical URIs:
  `repo://github.com/{owner}/{repo}@{sha}/{filePath}#{symbolName}`
  *(Example: `repo://github.com/acme/sdk@a1b2c3d/src/client.ts#ApiClient`)*.

---

## 3. Cross-Repository Symbol Resolution

When a developer in `frontend` clicks on an imported symbol `import { OrderSchema } from "@acme/order-contracts"`, the engine resolves the definition across repository boundaries using a three-tier resolution pipeline:

```
+------------------------------------------------------------------------------+
| 1. Manifest Matching                                                         |
|    Parse package.json / go.mod / Cargo.toml across all workspace repos.       |
|    Match package "@acme/order-contracts" -> Repo "backend/packages/contracts"|
+------------------------------------------------------------------------------+
                                       |
                                       v
+------------------------------------------------------------------------------+
| 2. Export Manifest Inspection                                                |
|    Scan package.json "exports" or "main" entrypoint in target repo.          |
|    Resolve to relative file: "dist/index.d.ts" or "src/index.ts".           |
+------------------------------------------------------------------------------+
                                       |
                                       v
+------------------------------------------------------------------------------+
| 3. AST Symbol Table Lookup                                                   |
|    Locate "OrderSchema" in target file's AST symbol map with line bounds.    |
|    Return navigation target: targetRepo + filePath + startLine.              |
+------------------------------------------------------------------------------+
```

### Language Manifest Mapping:
- **TypeScript / Node.js:** Read `package.json` `name` and `exports`. Support npm workspace aliases and path mappings.
- **Go:** Read `go.mod` module directive (`module github.com/acme/service`) and link `import "github.com/acme/service/pkg/auth"` to the corresponding repository folder.
- **Java / Kotlin:** Read `pom.xml` `<groupId>:<artifactId>` or Gradle `rootProject.name`. Link Maven coordinates to source packages.

---

## 4. SCIP (Source Code Intelligence Protocol) vs LSIF Options

For industrial-grade semantic accuracy beyond Tree-sitter regex/heuristic matching, RepoPilot evaluated both LSIF and SCIP:

| Evaluation Dimension | LSIF (Language Server Index Format) | SCIP (Source Code Intelligence Protocol) |
| :--- | :--- | :--- |
| **Data Format** | Verbose JSON-Lines graph (vertices & edges) | Compact Protocol Buffers (Protobuf) |
| **Index Size** | Extremely large (often 5x-10x repository size) | Highly compressed (typically 0.2x-0.5x size) |
| **Streaming / Parsing** | Slow line-by-line JSON parsing | Rapid zero-copy Protobuf deserialization |
| **Symbol Identity** | Graph vertex IDs (opaque integers) | Universal Human-Readable Symbol String (RFC format) |
| **Cross-Repo Linking** | Complex package vertex linking | Native: `scip-typescript npm @acme/core 1.2.0 src/auth.ts/` |

### Architectural Recommendation: SCIP
RepoPilot selects **SCIP** as the target protocol for rich multi-repo semantic intelligence:
1. **Universal Symbol String:** SCIP symbols encode package manager, package name, version, and symbol hierarchy directly into the symbol string:
   `scip-typescript npm @acme/shared-types 2.1.0 `src/types.ts`/UserSession#`
2. **Hybrid Ingestion Pipeline:**
   - **Tier 1 (Instant):** Tree-sitter WASM extracts symbols on the fly during repository ingestion (< 1 second).
   - **Tier 2 (Background / CI):** Pre-generated SCIP indexes uploaded during CI builds (`npm run scip:upload`) provide 100% precise "Find References" and "Go to Definition" across tens of repositories.

---

## 5. Memory Limits, Serverless Constraints & Eviction Policy

### 5.1 Serverless (Vercel) Resource Envelope
- **Maximum Execution Time:** 60 seconds (Hobby / Pro maxDuration).
- **Maximum RAM:** 1024 MB.
- **Capacities:** Ingesting 5 repositories with 1,500 files each would consume ~7,500 files and exceed available memory if unconstrained.

### 5.2 Multi-Repo Resource Governance
To operate reliably within serverless and browser limitations:
1. **Workspace Size Caps:**
   - Max Repositories per Workspace: **6 repositories**.
   - Max Total Files across Workspace: **4,000 files**.
   - Max In-Memory Shards: **3 active shards**; inactive shards evicted to disk cache / IndexedDB.
2. **Context Token Budget Splitting:**
   - When answering a question in a multi-repo workspace, the configurable context budget (e.g. 4,000 tokens) is dynamically divided:
     - **60% Primary Repository:** The repository where the user's inquiry originated.
     - **40% Secondary Dependencies:** Pro-rated based on cross-repo relevance scores (BM25 + symbol citation match).
3. **Browser IndexedDB Partitioning:**
   - Browser index caching utilizes separate IndexedDB object stores per repository SHA. Opening a multi-repo workspace only loads metadata for secondary repos, streaming file bodies on-demand.

---

## 6. Phased Implementation Roadmap

```
+-----------------------------------------------------------------------------------+
| Phase 1: Federated Multi-Repo Search (Estimated: Milestone 1)                     |
| - Store list of repositories in local workspace state.                            |
| - Query parallel search across active repository shards.                          |
| - Group search results by repository chip in the UI.                              |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Phase 2: Manifest-Driven Cross-Repo Navigation (Estimated: Milestone 2)           |
| - Scan package.json, go.mod, and pom.xml manifests for internal dependencies.     |
| - Enable "Jump to foreign repo definition" in the Code Explorer.                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Phase 3: SCIP Index Ingestion & Precise Cross-Repo References (Milestone 3)      |
| - Support loading pre-computed .scip protobuf index files.                        |
| - Cross-repo "Find all usages" and accurate type hierarchies.                     |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Phase 4: Multi-Repo System Architecture Visualizer (Milestone 4)                  |
| - Generate inter-repository dependency diagrams using Mermaid.                    |
| - Visualize API contract relationships (OpenAPI / gRPC) between repositories.     |
+-----------------------------------------------------------------------------------+
```

---

## 7. Open Risks & Explicit Design Boundaries

- **Authentication Complexity:** Different repositories in a workspace may belong to different organizations requiring separate GitHub token permissions.
- **Branch/SHA Drift:** In active development, secondary repos may update while the primary repo is pinned. All workspace definitions must strictly pin commit SHAs for reproducibility.
- **Strict Constraint:** This specification is design-only. No multi-repo runtime code is introduced into the production codebase in this iteration.
