import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { SearchEngine } from "@repopilot/search";
import { OllamaClient, PromptBuilder, CitationValidator } from "@repopilot/ai";
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
      const fallbackAnswer = `Local AI (Ollama) is currently offline at ${baseUrl}.

Here are the most relevant source files discovered via deterministic search for your query:
${chunks.map((c) => `- **[${c.filePath}:${c.startLine}-${c.endLine}]**`).join("\n")}

To enable AI explanations, start Ollama locally:
\`\`\`bash
ollama run ${model}
\`\`\``;

      return NextResponse.json({
        success: true,
        answer: fallbackAnswer,
        citations,
        confidence: "medium",
        modelUsed: "deterministic-search-fallback",
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
