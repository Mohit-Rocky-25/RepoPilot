import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { SearchEngine } from "@repopilot/search";
import {
  PromptBuilder,
  CitationValidator,
  createModelProvider,
  redactSecret
} from "@repopilot/ai";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { generateMermaidDiagram } from "@/lib/mermaidGenerator";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  validateAiEndpoint
} from "@/lib/security";
import { enforceRateLimit, checkPayloadSize } from "@/lib/rateLimiter";
import type { SourceReference } from "@repopilot/core";

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
      baseUrl = headerBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model = headerModel || process.env.DEFAULT_MODEL || "qwen2.5-coder:7b",
      providerType = headerProvider || (customApiKey ? "openai-compatible" : "ollama"),
      maxContextTokens = body.maxContextTokens || parseInt(process.env.MAX_CONTEXT_TOKENS || "4000", 10)
    } = body;

    // 4. Strict Input Validation
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
    const isLocalOllama = providerType === "ollama";
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

    // 6. Select Model Provider
    const provider = createModelProvider({
      type: providerType,
      baseUrl,
      apiKey: customApiKey,
      model
    });

    const status = await provider.isAvailable();

    // 7. Multi-factor BM25 Context Retrieval
    const searchEngine = new SearchEngine({ files: tree, symbols: [] });
    const retrieval = searchEngine.retrieveContext({
      query: question,
      targetFilePath,
      maxTokens: maxContextTokens
    });

    // 8. Refusal path: Refuse when retrieval finds no relevant evidence
    if (!retrieval.hasRelevantMatches && !/mermaid|diagram|architecture|flowchart|structure|graph|3d/i.test(question)) {
      return NextResponse.json({
        success: true,
        answer: "Based on the indexed repository files, no relevant evidence was found for your query. RepoPilot does not guess or answer ungrounded questions from model memory.",
        citations: [],
        validatedCitations: [],
        refused: true,
        confidence: "uncertain",
        qualityWarning,
        limitations: ["No matching files or symbols found in repository revision."],
        contextSummary: {
          includedFiles: [],
          omittedCount: 0
        }
      });
    }

    // Gather file chunks concurrently from ranked files
    const chunks: { filePath: string; startLine: number; endLine: number; content: string }[] = [];
    const citations: SourceReference[] = [];

    const candidateFiles = retrieval.includedFiles.slice(0, 4);
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
        chunks.push({
          filePath,
          startLine,
          endLine,
          content: snippet
        });

        citations.push({
          repoKey: `${owner}/${repo}`,
          commitSha: sha || "HEAD",
          filePath,
          startLine,
          endLine,
          codeSnippet: snippet.slice(0, 300)
        });
      }
    }

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
          contextSummary: {
            includedFiles: retrieval.includedFiles,
            omittedCount: retrieval.omittedCount
          },
          limitations: []
        });
      }

      const fallbackReason = status.error
        ? `Provider "${provider.name}" unavailable: ${redactSecret(status.error, customApiKey)}`
        : "Selected AI provider is offline.";

      const fallbackAnswer = `### 🔍 Deterministic Code Intelligence Analysis

**Query:** "${question}"

#### 📌 Grounding Code Locations Discovered (${chunks.length}):
${chunks.map((c) => `- **[\`${c.filePath}:${c.startLine}-${c.endLine}\`](/explore?file=${encodeURIComponent(c.filePath)}&line=${c.startLine})**`).join("\n")}

#### 📄 Code Context Preview:
${chunks.slice(0, 2).map((c) => `**${c.filePath}** (Lines ${c.startLine}-${c.endLine}):\n\`\`\`${c.filePath.endsWith(".ts") || c.filePath.endsWith(".tsx") ? "typescript" : "text"}\n${c.content.slice(0, 350)}\n\`\`\``).join("\n\n")}

---
*⚡ Powered by RepoPilot Deterministic Search Engine. To enable neural synthesis, configure your BYO API key in [Settings](/settings/ai) or start local Ollama with: \`ollama run ${model}\`.*`;

      return NextResponse.json({
        success: true,
        answer: fallbackAnswer,
        citations,
        confidence: "medium",
        modelUsed: "deterministic-search-engine",
        qualityWarning,
        contextSummary: {
          includedFiles: retrieval.includedFiles,
          omittedCount: retrieval.omittedCount
        },
        limitations: [fallbackReason]
      });
    }

    // 10. Provider is available: Build grounded prompt and generate response
    const { systemPrompt, userPrompt } = PromptBuilder.buildGroundedPrompt(
      question,
      chunks,
      `${owner}/${repo}`
    );

    const rawResponse = await provider.generate({
      model,
      prompt: userPrompt,
      systemPrompt,
      signal: req.signal
    });

    // 11. Strict Citation Validation & Cleansing
    const extractedCitations = CitationValidator.extractCitations(rawResponse);
    const validationResult = CitationValidator.validate(extractedCitations, tree);
    const cleanedAnswer = validationResult.invalidCitations.length > 0
      ? CitationValidator.cleanInvalidCitations(rawResponse, validationResult.invalidCitations)
      : rawResponse;

    return NextResponse.json({
      success: true,
      answer: cleanedAnswer,
      citations: citations,
      validatedCitations: validationResult.validCitations,
      citationWarning: validationResult.warning,
      confidence: validationResult.validCitations.length > 0 ? "high" : "medium",
      modelUsed: model,
      providerUsed: provider.name,
      qualityWarning,
      contextSummary: {
        includedFiles: retrieval.includedFiles,
        omittedCount: retrieval.omittedCount
      },
      rateLimit: ghClient.lastRateLimit
    });
  } catch (error: any) {
    const safeError = redactSecret(error.message || "Failed to process question.", customApiKey);
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
