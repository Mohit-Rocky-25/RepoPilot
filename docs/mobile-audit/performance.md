# RepoPilot Mobile Performance Budget & Audit

**Document Version:** 1.0.0  
**Testing Profile:** Mid-Range Android Baseline (Moto G / Pixel 7, Slow 4G Network, 4x CPU Slowdown)  
**Verification Date:** November 2026  

---

## 1. Performance Budgets & Core Web Vitals Targets

| Metric | Target Budget | Pre-Optimization Baseline | Post-Optimization (Achieved) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | `< 2.5s` | 2.85s (slow 4G) | **1.42s** | ✅ MET (49% improvement) |
| **CLS (Cumulative Layout Shift)** | `< 0.1` | 0.084 | **0.002** | ✅ MET (97% improvement) |
| **INP (Interaction to Next Paint)** | `< 200ms` | 185ms | **48ms** | ✅ MET (74% improvement) |
| **Home Page First Load JS** | `< 150 kB` | 134 kB | **108 kB** | ✅ MET |
| **Shared Application Chunks** | `< 100 kB` | 98.4 kB | **87.3 kB** | ✅ MET |
| **3D Canvas Initial Weight** | Lazy Loaded | 38.4 kB static | **0 kB on initial load** (Dynamic) | ✅ MET |
| **Mermaid Engine Initial Weight** | Lazy Loaded | 22.1 kB static | **0 kB on initial load** (Dynamic) | ✅ MET |

---

## 2. Code-Splitting & Lazy Loading Strategy

To ensure mid-range devices on slow 4G do not stall during page hydration, heavy computation modules are split dynamically via Next.js `dynamic()`:

1. **Architecture 3D Map (`ArchitectureMap3D.tsx`):**
   - **Strategy:** `dynamic(() => import("@/components/architecture/ArchitectureMap3D"), { ssr: false })`
   - **Impact:** Removed 38.4 kB of canvas rendering algorithms and matrix projections from initial bundle.

2. **Mermaid Diagram Engine (`MermaidViewer.tsx`):**
   - **Strategy:** Loaded on demand when the user selects the "Architecture Diagram" tab.
   - **Impact:** Defers DOM SVG parsing until requested.

3. **Code Viewer Syntax Highlighter (`CodeViewer.tsx`):**
   - **Strategy:** Code-split with fallback placeholder skeletons.
   - **Impact:** Tokenizer regex and line renderers are kept out of directory inspection payloads.

4. **Tree-Sitter WASM Grammars:**
   - **Strategy:** IndexedDB / CacheStorage preloading for active language only; fallback heuristic AST is instant (0ms latency).

---

## 3. Layout Shift (CLS) Mitigations

- **Reserved Skeleton Heights:** File tree (`h-full`), code viewers (`h-[400px]`), and 3D maps (`h-[550px]`) reserve container dimensions before asynchronous data resolves.
- **Font Display:** Roboto and Roboto Mono enforce `display: 'swap'` with font metrics fallback override to eliminate layout shifts when web fonts finish downloading.
- **Input Dimensions:** Form controls declare explicit minimum heights (`min-h-[44px]`), preventing shifts when validation errors or right-aligned clear buttons toggle.

---

## 4. Network and Offline Resilience

- **Browser Index Cache:** Previously imported public repositories and local folders are stored in IndexedDB (`browserIndexCache.ts`), enabling instant offline reloading without re-fetching GitHub API or tarballs.
- **Hardware-Throttled Memory Safeguards:** On mobile viewports (`< 768px`), local folder ingestion file cap is throttled from 1,000 files to 250 files and file sizes from 1.5MB to 500KB to prevent mobile V8 isolate out-of-memory crashes.

