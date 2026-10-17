import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { StackTraceParser, HypothesisEngine } from "@repopilot/debugging";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner, repo, sha, title, description, stackTrace } = body;

    if (!owner || !repo || !stackTrace) {
      return NextResponse.json(
        { error: "owner, repo, and stackTrace are required." },
        { status: 400 }
      );
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const tree = await client.fetchTree(owner, repo, sha || "HEAD");
    const repoFilePaths = tree.map((f) => f.path);

    // 1. Parse Stack Trace
    const parsedTrace = StackTraceParser.parse(stackTrace, repoFilePaths);

    // 2. Fetch snippets for culprit frames concurrently
    const fileSnippets = new Map<string, string>();
    const framesToFetch = parsedTrace.frames.slice(0, 3);
    const snippetResults = await Promise.allSettled(
      framesToFetch.map(async (frame) => {
        const content = await client.fetchFileContent(owner, repo, sha || "HEAD", frame.filePath);
        return { filePath: frame.filePath, snippet: content.slice(0, 1000) };
      })
    );

    for (const res of snippetResults) {
      if (res.status === "fulfilled" && res.value) {
        fileSnippets.set(res.value.filePath, res.value.snippet);
      }
    }

    // 3. Formulate Hypotheses & Candidate Patch
    const analysis = HypothesisEngine.analyze(
      `${owner}/${repo}`,
      sha || "HEAD",
      title || "Runtime Issue",
      description || "",
      parsedTrace,
      fileSnippets
    );

    return NextResponse.json({
      success: true,
      parsedTrace,
      ...analysis,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to analyze bug report." },
      { status: 500 }
    );
  }
}
