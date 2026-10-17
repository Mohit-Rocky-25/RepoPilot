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
    // 1. DoS Defense: Body size cap (64 KB)
    const sizeCheck = checkPayloadSize(req, 65536);
    if (sizeCheck) return sizeCheck;

    // 2. IP Rate Limiting (10 req/min for compute-heavy ask endpoint)
    const rateCheck = await enforceRateLimit(req, "ai");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    // 2. Read headers for BYO Key & Provider
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
      baseUrl = headerBaseUrl || "http://localhost:11434",
      model = headerModel || "qwen2.5-coder:1.5b",
      providerType = headerProvider || (customApiKey ? "openai-compatible" : "ollama")
    } = body;

    // 3. Strict Input Validation
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

    // 4. SSRF Protection: Validate baseUrl
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

    // 5. Select Model Provider
    const provider = createModelProvider({
      type: providerType,
      baseUrl,
      apiKey: customApiKey,
      model
    });

    const status = await provider.isAvailable();

    // 6. Deterministic Context Retrieval
    const searchEngine = new SearchEngine({ files: tree, symbols: [] });

    // Extract search terms from question
    const terms = question
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 2 && !["where", "what", "which", "does", "this", "that", "how"].includes(w.toLowerCase()));

    const searchQuery = terms.slice(0, 3).join(" ") || question;
    const searchMatches = searchEngine.search({
      query: searchQuery,
      type: "all",
      limit: 6
    });

    // Gather file chunks concurrently
    const chunks: { filePath: string; startLine: number; endLine: number; content: string }[] = [];
    const citations: SourceReference[] = [];

    const candidateFiles = targetFilePath
      ? [targetFilePath, ...searchMatches.map((m) => m.filePath).filter((p) => p !== targetFilePath)]
      : searchMatches.map((m) => m.filePath);

    const candidateSlice = candidateFiles.slice(0, 3);
    const chunkResults = await Promise.allSettled(
      candidateSlice.map(async (filePath) => {
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

    // 7. Fallback if provider is offline or unconfigured
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
        limitations: [fallbackReason]
      });
    }

    // 8. Provider is available: Build grounded prompt and generate response
    const { systemPrompt, userPrompt } = PromptBuilder.buildGroundedPrompt(
      question,
      chunks,
      `${owner}/${repo}`
    );

    const rawResponse = await provider.generate({
      model,
      prompt: userPrompt,
      systemPrompt
    });

    // 9. Validate citations in generated response
    const extractedCitations = CitationValidator.extractCitations(rawResponse);
    const validatedCitations = CitationValidator.validate(extractedCitations, tree);

    return NextResponse.json({
      success: true,
      answer: rawResponse,
      citations: citations,
      validatedCitations,
      confidence: "high",
      modelUsed: model,
      providerUsed: provider.name,
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
