import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { StackTraceParser, HypothesisEngine } from "@repopilot/debugging";
import { createModelProvider, redactSecret } from "@repopilot/ai";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  sanitizeErrorMessage
} from "@/lib/security";
import { enforceRateLimit, checkPayloadSize } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  let customApiKey: string | undefined;

  try {
    // 1. DoS Defense: Body size cap (64 KB)
    const sizeCheck = checkPayloadSize(req, 65536);
    if (sizeCheck) return sizeCheck;

    // 2. IP Rate Limiting (20 req/min for compute-heavy debugging analysis)
    const rateCheck = await enforceRateLimit(req, "debug");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    // Read optional AI headers
    customApiKey = req.headers.get("x-ai-key") || undefined;
    const headerProvider = req.headers.get("x-ai-provider") as any;
    const headerBaseUrl = req.headers.get("x-ai-base-url") || undefined;
    const headerModel = req.headers.get("x-ai-model") || undefined;

    const body = await req.json();
    const { owner, repo, sha, title, description, stackTrace } = body;

    // 3. Strict Input Validation
    if (!validateGitHubOwner(owner) || !validateGitHubRepo(repo)) {
      return NextResponse.json(
        { error: "Invalid repository identifier. Owner and repo must be alphanumeric." },
        { status: 400 }
      );
    }

    if (!stackTrace || typeof stackTrace !== "string" || !stackTrace.trim()) {
      return NextResponse.json(
        { error: "Stack trace is required." },
        { status: 400 }
      );
    }

    if (sha && !validateGitRevision(sha)) {
      return NextResponse.json(
        { error: "Invalid git revision or commit SHA format." },
        { status: 400 }
      );
    }

    const safeTitle = typeof title === "string" ? title.slice(0, 256) : "Runtime Issue";
    const safeDesc = typeof description === "string" ? description.slice(0, 2000) : "";

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const tree = await client.fetchTree(owner, repo, sha || "HEAD");
    const repoFilePaths = tree.map((f) => f.path);

    // 4. Parse Stack Trace across Node, Python, Go, Rust
    const parsedTrace = StackTraceParser.parse(stackTrace, repoFilePaths);

    // 5. Fetch snippets for culprit frames concurrently
    const fileSnippets = new Map<string, string>();
    const framesToFetch = parsedTrace.frames
      .filter((f) => validateFilePath(f.filePath))
      .slice(0, 3);

    const snippetResults = await Promise.allSettled(
      framesToFetch.map(async (frame) => {
        const content = await client.fetchFileContent(owner, repo, sha || "HEAD", frame.filePath);
        return { filePath: frame.filePath, snippet: content };
      })
    );

    for (const res of snippetResults) {
      if (res.status === "fulfilled" && res.value) {
        fileSnippets.set(res.value.filePath, res.value.snippet);
      }
    }

    // 6. Optional AI Patch Draft: ONLY request when AI provider is configured
    let aiDiffProposal: string | undefined;

    if (customApiKey || headerProvider === "ollama") {
      try {
        const provider = createModelProvider({
          type: headerProvider || (customApiKey ? "openai-compatible" : "ollama"),
          baseUrl: headerBaseUrl || "http://localhost:11434",
          apiKey: customApiKey,
          model: headerModel || "qwen2.5-coder:7b"
        });
        const avail = await provider.isAvailable();
        if (avail.available) {
          const culprit = parsedTrace.frames.find((f) => f.isUserCode) || parsedTrace.frames[0];
          if (culprit) {
            const fileContent = fileSnippets.get(culprit.filePath);
            if (fileContent) {
              const prompt = `Bug description: ${safeTitle}\n${safeDesc}\nStack trace:\n${stackTrace.slice(0, 500)}\n\nFile content for ${culprit.filePath}:\n${fileContent.slice(0, 2000)}\n\nGenerate ONLY a unified diff fixing this bug. Start with --- a/${culprit.filePath} and +++ b/${culprit.filePath}. Do not include markdown commentary.`;
              const diffRaw = await provider.generate({
                model: headerModel || "qwen2.5-coder:7b",
                prompt,
                systemPrompt: "You are an automated patch generator. Output ONLY a valid unified diff."
              });
              const match = /--- a\/[^\n]*\n\+\+\+ b\/[\s\S]*/.exec(diffRaw);
              if (match) {
                aiDiffProposal = match[0].replace(/```/g, "").trim();
              }
            }
          }
        }
      } catch {
        // AI diff generation failed - fall back cleanly to suggestion scaffold
      }
    }

    // 7. Formulate Hypotheses & In-Memory Validated Patch
    const analysis = HypothesisEngine.analyze(
      `${owner}/${repo}`,
      sha || "HEAD",
      safeTitle,
      safeDesc,
      parsedTrace,
      fileSnippets,
      aiDiffProposal,
      repoFilePaths
    );

    return NextResponse.json({
      success: true,
      parsedTrace,
      ...analysis,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    const safeError = sanitizeErrorMessage(redactSecret(error.message || "Failed to analyze bug report.", customApiKey));
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
