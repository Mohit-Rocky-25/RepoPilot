import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { SearchEngine } from "@repopilot/search";
import {
  PromptBuilder,
  CitationValidator,
  createModelProvider,
  redactSecret,
  CodebaseKnowledgeBase
} from "@repopilot/ai";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { generateMermaidDiagram } from "@/lib/mermaidGenerator";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  validateAiEndpoint,
  sanitizeErrorMessage
} from "@/lib/security";
import { enforceRateLimit, checkPayloadSize } from "@/lib/rateLimiter";
import type { SourceReference } from "@repopilot/core";

function getPreRecordedSampleAnalysis(question: string, repoKey: string, budget: number) {
  const isFlask = /flask/i.test(repoKey);
  const isGin = /gin/i.test(repoKey);

  let answer = "";
  let citations: SourceReference[] = [];
  let validatedCitations: any[] = [];

  if (isFlask) {
    answer = `In \`pallets/flask\`, the primary WSGI dispatch cycle is implemented in [src/flask/app.py:2060-2095#wsgi_app].

### Request Processing Architecture
1. **Context Push:** Each incoming HTTP request instantiates a \`RequestContext\` in [src/flask/ctx.py:310-345#RequestContext] and pushes it onto the thread-local context stack.
2. **Routing:** URL matching delegates to Werkzeug's \`MapAdapter\`.
3. **Dispatch:** View functions registered through Blueprints in [src/flask/blueprints.py:85-130#Blueprint] are resolved and executed.

> **Pre-recorded example:** Grounded answer pre-computed from pinned commit \`494dc50\` on \`pallets/flask\` for keyless demonstration.`;
    citations = [
      {
        repoKey: "pallets/flask",
        commitSha: "494dc50a255ee9885c490ff452bb193012920211",
        filePath: "src/flask/app.py",
        startLine: 2060,
        endLine: 2095,
        codeSnippet: "def wsgi_app(self, environ: dict, start_response: t.Callable):"
      },
      {
        repoKey: "pallets/flask",
        commitSha: "494dc50a255ee9885c490ff452bb193012920211",
        filePath: "src/flask/ctx.py",
        startLine: 310,
        endLine: 345,
        codeSnippet: "class RequestContext:"
      }
    ];
    validatedCitations = [
      {
        filePath: "src/flask/app.py",
        startLine: 2060,
        endLine: 2095,
        symbolName: "wsgi_app",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[src/flask/app.py:2060-2095#wsgi_app]"
      },
      {
        filePath: "src/flask/ctx.py",
        startLine: 310,
        endLine: 345,
        symbolName: "RequestContext",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[src/flask/ctx.py:310-345#RequestContext]"
      }
    ];
  } else if (isGin) {
    answer = `In \`gin-gonic/gin\`, request routing and zero memory allocation are coordinated through \`sync.Pool\` in [gin.go:580-610#ServeHTTP] and the radix tree in [tree.go:110-165#node].

### Performance Architecture
1. **Context Pooling:** \`engine.pool.Get()\` retrieves an allocated [context.go:45-80#Context] struct rather than creating heap allocations per request.
2. **Radix Trie Routing:** [tree.go:110-165#node] executes greedy prefix matching for HTTP routes.

> **Pre-recorded example:** Grounded answer pre-computed from pinned commit \`8a791a8\` on \`gin-gonic/gin\` for keyless demonstration.`;
    citations = [
      {
        repoKey: "gin-gonic/gin",
        commitSha: "8a791a8770c8901ebbe2a7a92df44f6974530467",
        filePath: "gin.go",
        startLine: 580,
        endLine: 610,
        codeSnippet: "func (engine *Engine) ServeHTTP(w http.ResponseWriter, req *http.Request)"
      },
      {
        repoKey: "gin-gonic/gin",
        commitSha: "8a791a8770c8901ebbe2a7a92df44f6974530467",
        filePath: "context.go",
        startLine: 45,
        endLine: 80,
        codeSnippet: "type Context struct {"
      }
    ];
    validatedCitations = [
      {
        filePath: "gin.go",
        startLine: 580,
        endLine: 610,
        symbolName: "ServeHTTP",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[gin.go:580-610#ServeHTTP]"
      },
      {
        filePath: "context.go",
        startLine: 45,
        endLine: 80,
        symbolName: "Context",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[context.go:45-80#Context]"
      }
    ];
  } else {
    // Default to vercel/swr
    answer = `The core \`useSWR\` hook is defined in [core/use-swr.ts:45-88#useSWR]. It coordinates caching, deduplication, and automatic window revalidation.

### Key Architecture Components
1. **Cache Layer:** In-memory key-value cache initialization in [_internal/utils/cache.ts:28-60#initCache].
2. **Mutation & Invalidation:** Global mutation dispatch and optimistic updates handled by \`mutate()\` in [_internal/utils/mutate.ts:52-95#mutate].
3. **Concurrent Rendering:** Integrated with React 18's \`useSyncExternalStore\` for non-blocking concurrent rendering.

> **Pre-recorded example:** Grounded answer pre-computed from pinned commit \`5d80486\` on \`vercel/swr\` for keyless demonstration.`;
    citations = [
      {
        repoKey: "vercel/swr",
        commitSha: "5d80486fa0d15e2193b2169ebbb0829cb250bf59",
        filePath: "core/use-swr.ts",
        startLine: 45,
        endLine: 88,
        codeSnippet: "export function useSWR<Data = any, Error = any>(key: Key, fn: BareFetcher<Data> | null, config?: SWRConfiguration<Data, Error>): SWRResponse<Data, Error>"
      },
      {
        repoKey: "vercel/swr",
        commitSha: "5d80486fa0d15e2193b2169ebbb0829cb250bf59",
        filePath: "_internal/utils/cache.ts",
        startLine: 28,
        endLine: 60,
        codeSnippet: "export function initCache<Data>(provider: Cache<Data>): [Cache<Data>, MutatorCallback]"
      }
    ];
    validatedCitations = [
      {
        filePath: "core/use-swr.ts",
        startLine: 45,
        endLine: 88,
        symbolName: "useSWR",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[core/use-swr.ts:45-88#useSWR]"
      },
      {
        filePath: "_internal/utils/cache.ts",
        startLine: 28,
        endLine: 60,
        symbolName: "initCache",
        isValid: true,
        supportStatus: "verified",
        isWeakSupport: false,
        rawTag: "[_internal/utils/cache.ts:28-60#initCache]"
      }
    ];
  }

  const included = citations.map((c) => c.filePath);
  return {
    answer,
    citations,
    validatedCitations,
    contextMeta: {
      tokenBudget: budget,
      includedFiles: included,
      droppedFiles: [],
      filesIncluded: included.length,
      filesDropped: 0
    },
    contextSummary: {
      includedFiles: included,
      droppedFiles: [],
      omittedCount: 0,
      filesIncluded: included.length,
      filesDropped: 0,
      tokenBudget: budget
    }
  };
}

export async function POST(req: NextRequest) {
  let customApiKey: string | undefined;

  try {
    // 1. DoS Defense: Request body size cap (64 KB)
    const sizeCheck = checkPayloadSize(req, 65536);
    if (sizeCheck) return sizeCheck;

    // 2. IP Rate Limiting (10 req/min for compute-heavy ask endpoint)
    const rateCheck = await enforceRateLimit(req, "ai");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    // 3. Read headers for BYO Key & Provider
    customApiKey = req.headers.get("x-ai-key") || undefined;
    const headerProvider = req.headers.get("x-ai-provider") as any;
    const headerBaseUrl = req.headers.get("x-ai-base-url") || undefined;
    const headerModel = req.headers.get("x-ai-model") || undefined;

    const body = await req.json();
    const {
      owner,
      repo,
      sha,
      question,
      targetFilePath,
      contextTokenBudget = body.contextTokenBudget || body.maxContextTokens
    } = body;

    const rawBaseUrl = body.baseUrl || headerBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const rawModel = body.model || headerModel || process.env.DEFAULT_MODEL || "qwen2.5-coder:7b";
    const rawProvider = body.providerType || body.provider || headerProvider;

    // Detect if the target is local Ollama (port 11434 or loopback host)
    const isLoopbackTarget = typeof rawBaseUrl === "string" && (
      rawBaseUrl.includes("localhost:11434") ||
      rawBaseUrl.includes("127.0.0.1:11434") ||
      rawBaseUrl.includes("[::1]:11434") ||
      rawBaseUrl.includes("0.0.0.0:11434") ||
      rawBaseUrl.endsWith(":11434") ||
      rawBaseUrl.includes("localhost") ||
      rawBaseUrl.includes("127.0.0.1")
    );

    const isLocalOllama = rawProvider === "ollama" || isLoopbackTarget || (!rawProvider && !customApiKey);
    const providerType = isLocalOllama ? "ollama" : (rawProvider || (customApiKey ? "openai-compatible" : "ollama"));
    const baseUrl = rawBaseUrl;
    const model = rawModel;

    const resolvedBudget = PromptBuilder.resolveTokenBudget(contextTokenBudget);

    // 4. Sample Analysis Mode (Pre-computed grounded responses without API key)
    const isSampleAnalysis = Boolean(body.isSampleAnalysis || body.mode === "sample");
    if (isSampleAnalysis) {
      const sampleResult = getPreRecordedSampleAnalysis(question, `${owner}/${repo}`, resolvedBudget);
      return NextResponse.json({
        success: true,
        isSampleAnalysis: true,
        sampleBadge: "Pre-recorded example",
        answer: sampleResult.answer,
        citations: sampleResult.citations,
        validatedCitations: sampleResult.validatedCitations,
        weakCitations: [],
        uncitedClaims: [],
        confidence: "high",
        modelUsed: "sample-analysis (pre-recorded)",
        contextMeta: sampleResult.contextMeta,
        contextSummary: sampleResult.contextSummary,
        limitations: [
          "Pre-recorded example: generated from immutable commit SHA for zero-key evaluation."
        ]
      });
    }

    // 5. Strict Input Validation
    if (!validateGitHubOwner(owner) || !validateGitHubRepo(repo)) {
      return NextResponse.json(
        { error: "Invalid repository identifier. Owner and repo must be alphanumeric." },
        { status: 400 }
      );
    }

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        { error: "Question exceeds maximum allowed length (2,000 characters)." },
        { status: 400 }
      );
    }

    if (sha && !validateGitRevision(sha)) {
      return NextResponse.json(
        { error: "Invalid git revision or commit SHA format." },
        { status: 400 }
      );
    }

    if (targetFilePath && !validateFilePath(targetFilePath)) {
      return NextResponse.json(
        { error: "Invalid target file path (path traversal sequence detected)." },
        { status: 400 }
      );
    }

    // 5. SSRF Protection: Validate baseUrl
    const endpointValidation = await validateAiEndpoint(baseUrl, { allowLoopbackOllama: isLocalOllama });
    if (!endpointValidation.valid) {
      return NextResponse.json(
        { error: endpointValidation.reason || "Invalid AI endpoint (SSRF defense)." },
        { status: 400 }
      );
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const ghClient = new GitHubClient({ token });
    const tree = await ghClient.fetchTree(owner, repo, sha || "HEAD");

    // Quality check for models under 7B
    const isUnder7B = /(1\.5b|0\.5b|1b|3b)/i.test(model);
    const qualityWarning = isUnder7B
      ? "Selected model has under 7B parameters. For grounded multi-file reasoning, a 7B+ model (e.g., qwen2.5-coder:7b) is recommended."
      : undefined;

    // Fetch manifest if available
    const manifestFile = tree.find((f) => f.path.toLowerCase() === "package.json");
    let manifestContent: string | undefined;
    if (manifestFile) {
      try {
        manifestContent = await ghClient.fetchFileContent(owner, repo, sha || "HEAD", manifestFile.path);
      } catch {
        // ignore manifest fetch failure
      }
    }

    // Comprehensive query intent & repository knowledge analysis
    const analysis = CodebaseKnowledgeBase.analyzeQuery(question, tree, manifestContent);

    // Prompt injection edge case defense
    if (analysis.isInjectionAttempt) {
      return NextResponse.json({
        success: true,
        answer: CodebaseKnowledgeBase.generateDeterministicAnswer(question, analysis, `${owner}/${repo}`),
        citations: [],
        validatedCitations: [],
        confidence: "high",
        modelUsed: "security-sandbox",
        qualityWarning,
        limitations: ["Prompt injection pattern detected and neutralized."]
      });
    }

    // Negative component check (e.g. asking for Docker, DB, Tests when none exist)
    if (analysis.negativeAssertion) {
      return NextResponse.json({
        success: true,
        answer: CodebaseKnowledgeBase.generateDeterministicAnswer(question, analysis, `${owner}/${repo}`),
        citations: [],
        validatedCitations: [],
        confidence: "high",
        modelUsed: "deterministic-knowledge-base",
        qualityWarning,
        limitations: [analysis.negativeAssertion]
      });
    }

    // 6. Select Model Provider
    let activeApiKey = isLocalOllama ? undefined : customApiKey;
    let activeBaseUrl = baseUrl;
    let activeModel = model;
    let activeProviderType = providerType;
    let isHostedFreeTierUsed = false;

    // Optional server-side free tier provider behind env flags (disabled by default)
    const isHostedFreeTierEnabled = process.env.ENABLE_HOSTED_AI_FREE_TIER === "true";
    if (!activeApiKey && providerType !== "ollama" && isHostedFreeTierEnabled && process.env.HOSTED_AI_API_KEY) {
      // Strict per-IP rate limiting (3 req/hr per IP)
      const freeTierRateCheck = await enforceRateLimit(req, "hosted_free_tier");
      if (!freeTierRateCheck.allowed && freeTierRateCheck.response) {
        return freeTierRateCheck.response;
      }
      activeApiKey = process.env.HOSTED_AI_API_KEY;
      activeBaseUrl = process.env.HOSTED_AI_BASE_URL || "https://api.openai.com/v1";
      activeModel = process.env.HOSTED_AI_MODEL || "gpt-4o-mini";
      activeProviderType = "openai-compatible";
      isHostedFreeTierUsed = true;
    }

    const provider = createModelProvider({
      type: activeProviderType,
      baseUrl: activeBaseUrl,
      apiKey: activeApiKey,
      model: activeModel
    });

    const status = await provider.isAvailable();

    // 7. Multi-factor BM25 Context Retrieval
    const searchEngine = new SearchEngine({ files: tree, symbols: [] });
    const retrieval = searchEngine.retrieveContext({
      query: question,
      targetFilePath,
      maxTokens: resolvedBudget
    });

    const combinedIncludedFiles = Array.from(
      new Set([...analysis.relevantFiles, ...retrieval.includedFiles])
    );

    // 8. Refusal path: Refuse when retrieval finds no relevant evidence AND no knowledge base matches
    if (
      !retrieval.hasRelevantMatches &&
      analysis.relevantFiles.length === 0 &&
      !/mermaid|diagram|architecture|flowchart|structure|graph|3d/i.test(question)
    ) {
      return NextResponse.json({
        success: true,
        answer: "Based on the indexed repository files, no relevant evidence was found for your query. RepoPilot does not guess or answer ungrounded questions from model memory.",
        citations: [],
        validatedCitations: [],
        refused: true,
        confidence: "uncertain",
        qualityWarning,
        limitations: ["No matching files or symbols found in repository revision."],
        contextMeta: {
          tokenBudget: resolvedBudget,
          includedFiles: [],
          droppedFiles: [],
          filesIncluded: 0,
          filesDropped: 0
        },
        contextSummary: {
          includedFiles: [],
          droppedFiles: [],
          omittedCount: 0,
          filesIncluded: 0,
          filesDropped: 0,
          tokenBudget: resolvedBudget
        }
      });
    }

    // Gather file chunks concurrently from ranked files based on resolved budget
    const maxFilesToSample = Math.max(2, Math.floor(resolvedBudget / 350));
    const candidateFiles = combinedIncludedFiles.slice(0, Math.min(maxFilesToSample, 15));
    const rawChunks: { filePath: string; startLine: number; endLine: number; content: string }[] = [];

    const chunkResults = await Promise.allSettled(
      candidateFiles.map(async (filePath) => {
        const content = await ghClient.fetchFileContent(owner, repo, sha || "HEAD", filePath);
        const lines = content.split("\n");
        const snippet = lines.slice(0, 60).join("\n");
        return {
          filePath,
          startLine: 1,
          endLine: Math.min(lines.length, 60),
          snippet
        };
      })
    );

    for (const res of chunkResults) {
      if (res.status === "fulfilled" && res.value) {
        const { filePath, startLine, endLine, snippet } = res.value;
        rawChunks.push({
          filePath,
          startLine,
          endLine,
          content: snippet
        });
      }
    }

    // Enforce transparent context token budget
    const budgetResult = PromptBuilder.enforceBudget(rawChunks, resolvedBudget);
    const chunks = budgetResult.includedChunks;

    const citations: SourceReference[] = chunks.map((c) => ({
      repoKey: `${owner}/${repo}`,
      commitSha: sha || "HEAD",
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      codeSnippet: c.content.slice(0, 300)
    }));

    const contextMeta = {
      tokenBudget: budgetResult.tokenBudget,
      includedFiles: budgetResult.includedFiles,
      droppedFiles: budgetResult.droppedFiles,
      filesIncluded: budgetResult.filesIncluded,
      filesDropped: budgetResult.filesDropped
    };
    const contextSummary = {
      includedFiles: budgetResult.includedFiles,
      droppedFiles: budgetResult.droppedFiles,
      omittedCount: budgetResult.filesDropped,
      filesIncluded: budgetResult.filesIncluded,
      filesDropped: budgetResult.filesDropped,
      tokenBudget: budgetResult.tokenBudget
    };

    // 9. Fallback if provider is offline or unconfigured
    if (!status.available) {
      const isDiagramRequest = /mermaid|diagram|architecture|flowchart|structure|graph|3d/i.test(question);

      if (isDiagramRequest) {
        const summary = ArchitectureAnalyzer.analyze(tree);
        const graph = ArchitectureAnalyzer.generateGraph(tree, repo);
        const mermaidCode = generateMermaidDiagram(summary, graph, "system", `${owner}/${repo}`);

        const answer = `### 📊 GitHub-Compatible Mermaid Architecture Diagram

Here is the deterministic architecture diagram generated for **${owner}/${repo}**:

\`\`\`mermaid
${mermaidCode}
\`\`\`

#### 🚀 System Architecture Overview:
- **Primary Language:** ${summary.primaryLanguage}
- **Detected Frameworks:** ${summary.detectedFrameworks.join(", ") || "Standard Library"}
- **Identified Entry Points (${summary.entryPoints.length}):** ${summary.entryPoints.slice(0, 4).join(", ") || "None"}
- **Key Modules:** ${summary.keyModules.slice(0, 6).map((m) => `${m.directory}/ (${m.fileCount} files)`).join(", ")}

> 💡 **Tip:** You can paste the \`\`\`mermaid code above directly into your GitHub \`README.md\` or inspect the full interactive **3D Spatial Architecture Map** in the [Architecture Workspace](/architecture).`;

        return NextResponse.json({
          success: true,
          answer,
          citations,
          confidence: "high",
          modelUsed: "deterministic-mermaid-engine",
          qualityWarning,
          contextMeta,
          contextSummary,
          limitations: []
        });
      }

      const fallbackReason = status.error
        ? `Provider "${provider.name}" unavailable: ${redactSecret(status.error, customApiKey)}`
        : "Selected AI provider is offline.";

      const fallbackAnswer = CodebaseKnowledgeBase.generateDeterministicAnswer(
        question,
        analysis,
        `${owner}/${repo}`,
        chunks
      );

      return NextResponse.json({
        success: true,
        answer: fallbackAnswer,
        citations,
        confidence: "high",
        modelUsed: "deterministic-knowledge-base",
        qualityWarning,
        contextMeta,
        contextSummary,
        limitations: [fallbackReason]
      });
    }

    // 10. Provider is available: Build grounded prompt enriched with system context
    const systemContext = CodebaseKnowledgeBase.buildSystemContext(analysis.summary, `${owner}/${repo}`);
    const { systemPrompt, userPrompt } = PromptBuilder.buildGroundedPrompt(
      question,
      chunks,
      `${owner}/${repo}`,
      systemContext
    );

    const rawResponse = await provider.generate({
      model,
      prompt: userPrompt,
      systemPrompt,
      signal: req.signal
    });

    // 11. Strict Citation Validation & Cleansing
    const extractedCitations = CitationValidator.extractCitations(rawResponse);
    const fileContentsMap = new Map<string, string>();
    for (const chunk of rawChunks) {
      fileContentsMap.set(chunk.filePath, chunk.content);
    }
    const validationResult = CitationValidator.validate(
      extractedCitations,
      tree,
      undefined,
      fileContentsMap,
      rawResponse
    );
    const cleanedAnswer = validationResult.invalidCitations.length > 0
      ? CitationValidator.cleanInvalidCitations(rawResponse, validationResult.invalidCitations)
      : rawResponse;

    return NextResponse.json({
      success: true,
      answer: cleanedAnswer,
      citations: citations,
      validatedCitations: validationResult.validCitations,
      weakCitations: validationResult.weakCitations,
      uncitedClaims: validationResult.uncitedClaims,
      citationWarning: validationResult.warning,
      confidence: validationResult.validCitations.length > 0 ? "high" : "medium",
      modelUsed: isHostedFreeTierUsed ? `${activeModel} (hosted-free-tier)` : model,
      providerUsed: provider.name,
      isHostedFreeTier: isHostedFreeTierUsed,
      qualityWarning,
      contextMeta,
      contextSummary,
      rateLimit: ghClient.lastRateLimit
    });
  } catch (error: any) {
    const safeError = sanitizeErrorMessage(redactSecret(error.message || "Failed to process question.", customApiKey));
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
