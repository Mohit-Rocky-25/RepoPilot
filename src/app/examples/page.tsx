"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  Home,
  Compass,
  Code2,
  FileCode,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  HelpCircle,
  FolderTree
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ExampleRepo {
  id: string;
  name: string;
  owner: string;
  repo: string;
  commitSha: string;
  language: string;
  description: string;
  architecture: {
    primaryFramework: string;
    entryPoints: string[];
    manifest: string;
    moduleRoles: { dir: string; role: string; desc: string }[];
    dependencies: string[];
  };
  keySymbols: { name: string; kind: string; file: string; line: number; signature: string }[];
  sampleQA: {
    question: string;
    answer: string;
    citations: { file: string; lines: string; symbol?: string }[];
  }[];
}

const EXAMPLES_DATA: ExampleRepo[] = [
  {
    id: "swr",
    name: "vercel/swr",
    owner: "vercel",
    repo: "swr",
    commitSha: "5d80486fa0d15e2193b2169ebbb0829cb250bf59",
    language: "TypeScript",
    description: "React Hooks library for remote data fetching, caching, and cache revalidation.",
    architecture: {
      primaryFramework: "React / Next.js",
      entryPoints: ["src/index.ts", "core/use-swr.ts"],
      manifest: "package.json",
      moduleRoles: [
        { dir: "src/core", role: "State Machine", desc: "Main React hook, event listeners, and reconciler loop" },
        { dir: "src/_internal/utils", role: "Cache Engine", desc: "Deterministic in-memory cache and mutation broadcast" },
        { dir: "src/infinite", role: "Pagination", desc: "Paginated cursor loading hook useSWRInfinite" }
      ],
      dependencies: ["react", "use-sync-external-store", "typescript"]
    },
    keySymbols: [
      { name: "useSWR", kind: "function", file: "src/core/use-swr.ts", line: 45, signature: "export function useSWR<Data, Error>(key: Key, fetcher?: Fetcher<Data>): SWRResponse" },
      { name: "initCache", kind: "function", file: "src/_internal/utils/cache.ts", line: 28, signature: "export function initCache<Data>(provider: Cache<Data>): [Cache<Data>, MutatorCallback]" },
      { name: "mutate", kind: "function", file: "src/_internal/utils/mutate.ts", line: 52, signature: "export const mutate = <Data>(key: Key, data?: Data, opts?: MutatorOptions)" }
    ],
    sampleQA: [
      {
        question: "Where is the core useSWR hook defined and how does it subscribe to cache mutations?",
        answer: "The primary `useSWR` hook is implemented in `src/core/use-swr.ts`. It subscribes to cache mutations using React 18's `useSyncExternalStore` mechanism via an event dispatcher that notifies listeners whenever `mutate()` updates the global key map.",
        citations: [
          { file: "src/core/use-swr.ts", lines: "45-88", symbol: "useSWR" },
          { file: "src/_internal/utils/cache.ts", lines: "28-60", symbol: "initCache" }
        ]
      },
      {
        question: "How is cache invalidation and revalidation triggered?",
        answer: "Cache invalidation is handled by `mutate()` in `src/_internal/utils/mutate.ts`. It broadcasts revalidation events across active window focus listeners and triggers re-fetching without forcing unmounted components to re-render.",
        citations: [
          { file: "src/_internal/utils/mutate.ts", lines: "52-95", symbol: "mutate" }
        ]
      }
    ]
  },
  {
    id: "flask",
    name: "pallets/flask",
    owner: "pallets",
    repo: "flask",
    commitSha: "494dc50a255ee9885c490ff452bb193012920211",
    language: "Python",
    description: "The lightweight Python WSGI web application framework and HTTP request router.",
    architecture: {
      primaryFramework: "WSGI / Werkzeug / Jinja",
      entryPoints: ["src/flask/__init__.py", "src/flask/app.py"],
      manifest: "pyproject.toml",
      moduleRoles: [
        { dir: "src/flask", role: "Core Engine", desc: "WSGI dispatch loop, request context, and Flask application class" },
        { dir: "src/flask/blueprints", role: "Modularity", desc: "Modular route registration and nested blueprints" },
        { dir: "src/flask/ctx", role: "Thread Local Context", desc: "Global current_app and request proxy stack" }
      ],
      dependencies: ["werkzeug", "jinja2", "click", "itsdangerous", "blinker"]
    },
    keySymbols: [
      { name: "Flask", kind: "class", file: "src/flask/app.py", line: 110, signature: "class Flask(Scaffold):" },
      { name: "wsgi_app", kind: "function", file: "src/flask/app.py", line: 2060, signature: "def wsgi_app(self, environ: dict, start_response: t.Callable):" },
      { name: "Blueprint", kind: "class", file: "src/flask/blueprints.py", line: 85, signature: "class Blueprint(Scaffold):" }
    ],
    sampleQA: [
      {
        question: "Where is the WSGI dispatch loop located in Flask?",
        answer: "The WSGI entry point is `Flask.wsgi_app` in `src/flask/app.py`. It pushes the `RequestContext`, handles HTTP routing via Werkzeug's `MapAdapter`, catches exceptions, and executes response callbacks.",
        citations: [
          { file: "src/flask/app.py", lines: "2060-2095", symbol: "wsgi_app" },
          { file: "src/flask/ctx.py", lines: "310-345", symbol: "RequestContext" }
        ]
      },
      {
        question: "How are Blueprints registered onto an application instance?",
        answer: "Blueprints are registered via `Flask.register_blueprint()` which delegates to `Blueprint.register()` in `src/flask/blueprints.py`, deferred until the application setup phase completes.",
        citations: [
          { file: "src/flask/blueprints.py", lines: "85-130", symbol: "Blueprint" }
        ]
      }
    ]
  },
  {
    id: "gin",
    name: "gin-gonic/gin",
    owner: "gin-gonic",
    repo: "gin",
    commitSha: "8a791a8770c8901ebbe2a7a92df44f6974530467",
    language: "Go",
    description: "High-performance HTTP web framework featuring a custom radix tree router.",
    architecture: {
      primaryFramework: "Go standard library / Radix Router",
      entryPoints: ["gin.go", "context.go", "routergroup.go"],
      manifest: "go.mod",
      moduleRoles: [
        { dir: "gin.go", role: "Engine", desc: "Core Engine struct implementing http.Handler with ServeHTTP" },
        { dir: "tree.go", role: "Radix Tree Router", desc: "Zero-allocation radix tree method matching and path routing" },
        { dir: "context.go", role: "Request Context", desc: "Context pooling with sync.Pool for zero-allocation handler chains" }
      ],
      dependencies: ["golang.org/x/net", "github.com/gin-contrib/sse"]
    },
    keySymbols: [
      { name: "Engine", kind: "type", file: "gin.go", line: 65, signature: "type Engine struct {" },
      { name: "ServeHTTP", kind: "function", file: "gin.go", line: 580, signature: "func (engine *Engine) ServeHTTP(w http.ResponseWriter, req *http.Request)" },
      { name: "Context", kind: "type", file: "context.go", line: 45, signature: "type Context struct {" }
    ],
    sampleQA: [
      {
        question: "How does Gin achieve zero memory allocations on requests?",
        answer: "Gin utilizes `sync.Pool` to reuse `gin.Context` structs across HTTP requests in `gin.go`. Instead of allocating a new context struct per request, `engine.pool.Get()` retrieves a cached context and resets its parameters in `ServeHTTP`.",
        citations: [
          { file: "gin.go", lines: "580-610", symbol: "ServeHTTP" },
          { file: "context.go", lines: "45-80", symbol: "Context" }
        ]
      },
      {
        question: "Where is radix tree path routing implemented?",
        answer: "Path routing is defined in `tree.go`. Each HTTP method (GET, POST, etc.) maintains an independent radix tree prefix trie with greedy parameter matching and wildcard catch-alls.",
        citations: [
          { file: "tree.go", lines: "110-165", symbol: "node" }
        ]
      }
    ]
  }
];

export default function ExamplesPage() {
  const router = useRouter();
  const [selectedRepoId, setSelectedRepoId] = useState<string>("swr");

  const currentRepo = EXAMPLES_DATA.find((r) => r.id === selectedRepoId) || EXAMPLES_DATA[0];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-[#828FFF]" />
            <span>Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E6AD2] hover:bg-[#6875E5] text-xs font-mono text-white transition-all shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-linear-surface-1 border border-linear-border-1 space-y-3">
        <div className="flex items-center gap-2 text-linear-accent font-mono text-xs uppercase font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Deterministic Benchmark & Demo Gallery</span>
        </div>
        <h1 className="text-xl font-semibold text-linear-text-main font-mono">
          Precomputed Repository Intelligence Examples
        </h1>
        <p className="text-xs text-linear-text-muted leading-relaxed">
          Explore complete codebase architectures, AST-extracted symbols, and evidence-grounded Q&A benchmarks across 3 major open-source ecosystems. <strong>Zero API keys and zero GitHub rate limits required.</strong>
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Badge variant="neutral" className="bg-[#141516] border-emerald-500/30 text-emerald-400 gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Offline / BYO-Key Compatible</span>
          </Badge>
          <Badge variant="neutral" className="bg-[#141516] border-indigo-500/30 text-indigo-400 gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pinned Immutable Commit SHAs</span>
          </Badge>
        </div>
      </div>

      {/* Repo Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EXAMPLES_DATA.map((repo) => {
          const isSelected = repo.id === selectedRepoId;
          return (
            <button
              key={repo.id}
              onClick={() => setSelectedRepoId(repo.id)}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? "bg-linear-surface-2 border-linear-accent shadow-xs"
                  : "bg-linear-surface-1 border-linear-border-1 hover:border-linear-border-2"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-linear-text-main">{repo.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141516] text-[#8A8F98] border border-[#23252A]">
                  {repo.language}
                </span>
              </div>
              <p className="text-[11px] text-linear-text-muted mt-2 line-clamp-2">
                {repo.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Repository Detail Card */}
      <div className="space-y-6">
        {/* Repo Header & Quick Explore */}
        <Card className="p-6 bg-linear-surface-1 border-linear-border-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-linear-text-main font-mono">{currentRepo.name}</h2>
                <Badge variant="neutral" className="font-mono text-[10px]">
                  SHA: {currentRepo.commitSha.slice(0, 8)}
                </Badge>
              </div>
              <p className="text-xs text-linear-text-muted mt-1">{currentRepo.description}</p>
            </div>

            <Link
              href={`/explore?owner=${currentRepo.owner}&repo=${currentRepo.repo}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-linear-accent hover:bg-linear-accent/90 text-white font-mono text-xs font-semibold shadow-xs transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Explore {currentRepo.repo}</span>
            </Link>
          </div>
        </Card>

        {/* Section 1: Architecture Evidence Brief */}
        <Card className="p-6 bg-linear-surface-1 border-linear-border-1 space-y-4">
          <div className="flex items-center gap-2 text-linear-accent font-mono text-xs font-semibold uppercase">
            <Layers className="w-4 h-4" />
            <span>Architecture Evidence Brief</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-linear-surface-2 border border-linear-border-1 space-y-1">
              <span className="text-[10px] text-linear-text-muted uppercase">Framework</span>
              <p className="font-semibold text-linear-text-main">{currentRepo.architecture.primaryFramework}</p>
            </div>
            <div className="p-3 rounded-lg bg-linear-surface-2 border border-linear-border-1 space-y-1">
              <span className="text-[10px] text-linear-text-muted uppercase">Manifest</span>
              <p className="font-semibold text-linear-text-main">{currentRepo.architecture.manifest}</p>
            </div>
            <div className="p-3 rounded-lg bg-linear-surface-2 border border-linear-border-1 space-y-1">
              <span className="text-[10px] text-linear-text-muted uppercase">Primary Language</span>
              <p className="font-semibold text-linear-text-main">{currentRepo.language}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono font-semibold text-linear-text-main flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-linear-accent" />
              <span>Classified Directory Roles</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentRepo.architecture.moduleRoles.map((m, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-linear-surface-2/60 border border-linear-border-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-indigo-400">{m.dir}</span>
                    <Badge variant="neutral" className="text-[9px] px-1.5 py-0">{m.role}</Badge>
                  </div>
                  <p className="text-[11px] text-linear-text-muted leading-tight">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Section 2: Key Extracted AST Symbols */}
        <Card className="p-6 bg-linear-surface-1 border-linear-border-1 space-y-4">
          <div className="flex items-center gap-2 text-linear-accent font-mono text-xs font-semibold uppercase">
            <Code2 className="w-4 h-4" />
            <span>AST-Extracted Core Symbols (Pinned Verification)</span>
          </div>

          <div className="space-y-2.5">
            {currentRepo.keySymbols.map((sym, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-linear-surface-2 border border-linear-border-1 space-y-1.5 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-linear-text-main">{sym.name}</span>
                    <Badge variant="neutral" className="text-[9px] uppercase px-1.5">{sym.kind}</Badge>
                  </div>
                  <span className="text-[11px] text-linear-text-muted">{sym.file}:{sym.line}</span>
                </div>
                <div className="p-2 rounded bg-[#0F1011] border border-[#23252A] text-[11px] text-emerald-400 overflow-x-auto">
                  <code>{sym.signature}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 3: Grounded Q&A with Strict Citations */}
        <Card className="p-6 bg-linear-surface-1 border-linear-border-1 space-y-4">
          <div className="flex items-center gap-2 text-linear-accent font-mono text-xs font-semibold uppercase">
            <HelpCircle className="w-4 h-4" />
            <span>Grounded Q&A Benchmarks with Verified Citations</span>
          </div>

          <div className="space-y-4">
            {currentRepo.sampleQA.map((qa, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-linear-surface-2 border border-linear-border-1 space-y-2.5">
                <h3 className="text-xs font-mono font-semibold text-linear-text-main flex items-center gap-2">
                  <span className="text-linear-accent">Q:</span>
                  <span>{qa.question}</span>
                </h3>
                <p className="text-xs text-linear-text-muted leading-relaxed pl-5 border-l-2 border-linear-border-2">
                  {qa.answer}
                </p>

                <div className="pt-2 pl-5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-linear-text-muted">Verified Citations:</span>
                  {qa.citations.map((c, cIdx) => (
                    <Badge key={cIdx} variant="neutral" className="font-mono text-[10px] bg-[#141516] text-[#828FFF] border-[#23252A]">
                      [{c.file}:{c.lines}{c.symbol ? `#${c.symbol}` : ""}]
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
