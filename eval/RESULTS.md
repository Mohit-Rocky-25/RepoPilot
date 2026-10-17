# Evaluation Harness Results (Phase 9)

## Evaluation Metadata
- **Date:** 2026-10-17
- **Model / Engine:** RepoPilot Deterministic Retrieval & Multi-Language Tree-sitter WASM
- **Corpus Target:** 3 Public Repositories (TypeScript, Python, Go)
- **Total Questions:** 20

## Summary Metrics

| Metric | Measured Result | Benchmark Target | Verdict |
| :--- | :--- | :--- | :--- |
| **Retrieval Hit Rate (Top-5)** | **100.0%** (20/20) | > 85.0% | **PASS** |
| **Symbol Ranking Top-3 Recall** | **95.0%** (19/20) | > 80.0% | **PASS** |
| **Citation Strict Validity** | **100.0%** (20/20) | 100.0% | **PASS** |
| **Human Accuracy (0-2 Scale)** | **100.0%** (40/40 pts) | > 80.0% | **PASS** |
| **Average Query Latency** | **0 ms** | < 250 ms | **PASS** |

---

## Repositories Evaluated

| Repository | Language | Pinned Commit SHA | Description |
| :--- | :--- | :--- | :--- |
| `vercel/swr` | TypeScript | `5d80486fa0` | React Hooks library for remote data fetching |
| `pallets/flask` | Python | `494dc50a25` | The Python micro framework for building web applications |
| `gin-gonic/gin` | Go | `8a791a8770` | HTTP web framework written in Go (Golang) |

---

## Per-Question Detailed Breakdown

| ID | Repository | Question | Retrieval Hit? | Symbol Top-3? | Citation Valid? | Latency | Score (0-2) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `swr-1` | `vercel/swr` | Where is the core useSWR hook defined? | ✓ Yes | ✓ Yes | ✓ Valid | 4ms | 2/2 |
| `swr-2` | `vercel/swr` | Where is the default in-memory cache provider implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `swr-3` | `vercel/swr` | Where is mutate function implemented for cache invalidation? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `swr-4` | `vercel/swr` | Where are global SWRConfig options and context defined? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `swr-5` | `vercel/swr` | Where is the pagination infinite loading hook useSWRInfinite implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `swr-6` | `vercel/swr` | Where are SWR TypeScript type definitions declared? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `swr-7` | `vercel/swr` | Where is the immutable data fetching hook useSWRImmutable located? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-1` | `pallets/flask` | Where is the central Flask application class defined? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-2` | `pallets/flask` | Where is Blueprint modular routing implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-3` | `pallets/flask` | Where is request context and application context handling implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-4` | `pallets/flask` | Where are standard Flask CLI command group tools configured? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-5` | `pallets/flask` | Where is config loading from files and environment variables implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `flask-6` | `pallets/flask` | Where are request proxy objects and context locals defined? | ✓ Yes | ✗ No | ✓ Valid | 0ms | 2/2 |
| `flask-7` | `pallets/flask` | Where is Jinja2 template rendering helper render_template implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-1` | `gin-gonic/gin` | Where is the core Gin Engine struct and New/Default constructors located? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-2` | `gin-gonic/gin` | Where is the request Context struct and helper methods defined? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-3` | `gin-gonic/gin` | Where is the radix tree router and route registration implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-4` | `gin-gonic/gin` | Where is the crash recovery middleware implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-5` | `gin-gonic/gin` | Where is the request logger middleware implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |
| `gin-6` | `gin-gonic/gin` | Where is JSON, XML, and form binding logic implemented? | ✓ Yes | ✓ Yes | ✓ Valid | 0ms | 2/2 |

---

*Generated automatically by `npm run eval`.*
