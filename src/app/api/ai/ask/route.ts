import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { SearchEngine } from "@repopilot/search";
import { OllamaClient, PromptBuilder, CitationValidator } from "@repopilot/ai";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { generateMermaidDiagram } from "@/lib/mermaidGenerator";
import type { SourceReference } from "@repopilot/core";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      owner,
      repo,
      sha,
      question,
      targetFilePath,
      baseUrl = "http://localhost:11434",
      model = "qwen2.5-coder:1.5b"
    } = body;

    if (!owner || !repo || !question) {
      return NextResponse.json(
        { error: "owner, repo, and question are required." },
        { status: 400 }
      );
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const ghClient = new GitHubClient({ token });
    const tree = await ghClient.fetchTree(owner, repo, sha || "HEAD");

    // 1. Check if Ollama is available
    const ollama = new OllamaClient(baseUrl);
    const ollamaStatus = await ollama.checkStatus();

    // 2. Deterministic Context Retrieval
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

    // 3. Fallback if Ollama is offline or uninstalled
    if (!ollamaStatus.isAvailable) {
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

      const fallbackAnswer = `### 🔍 Deterministic Code Intelligence Analysis

**Query:** "${question}"

#### 📌 Grounding Code Locations Discovered (${chunks.length}):
${chunks.map((c) => `- **[\`${c.filePath}:${c.startLine}-${c.endLine}\`](/explore?file=${encodeURIComponent(c.filePath)}&line=${c.startLine})**`).join("\n")}

#### 📄 Code Context Preview:
${chunks.slice(0, 2).map((c) => `**${c.filePath}** (Lines ${c.startLine}-${c.endLine}):\n\`\`\`${c.filePath.endsWith(".ts") || c.filePath.endsWith(".tsx") ? "typescript" : "text"}\n${c.content.slice(0, 350)}\n\`\`\``).join("\n\n")}

---
*⚡ Powered by RepoPilot Deterministic Search Engine (Zero API Fees). To enable local neural synthesis, run: \`ollama run ${model}\`.*`;

      return NextResponse.json({
        success: true,
        answer: fallbackAnswer,
        citations,
        confidence: "medium",
        modelUsed: "deterministic-search-engine",
        limitations: [
          "Ollama offline: Showing deterministic code retrieval without LLM synthesis."
        ]
      });
    }

    // 4. Ollama is available: Build grounded prompt and run local inference
    const { systemPrompt, userPrompt } = PromptBuilder.buildGroundedPrompt(
      question,
      chunks,
      `${owner}/${repo}`
    );

    const rawResponse = await ollama.generate(model, userPrompt, systemPrompt);

    // 5. Validate citations in generated response
    const extractedCitations = CitationValidator.extractCitations(rawResponse);
    const validatedCitations = CitationValidator.validate(extractedCitations, tree);

    return NextResponse.json({
      success: true,
      answer: rawResponse,
      citations: citations,
      validatedCitations,
      confidence: "high",
      modelUsed: model,
      rateLimit: ghClient.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process question." },
      { status: 500 }
    );
  }
}
