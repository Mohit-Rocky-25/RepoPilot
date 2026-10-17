import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { StackTraceParser, HypothesisEngine } from "@repopilot/debugging";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath
} from "@/lib/security";
import { enforceRateLimit, checkPayloadSize } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // 1. DoS Defense: Body size cap (64 KB)
    const sizeCheck = checkPayloadSize(req, 65536);
    if (sizeCheck) return sizeCheck;

    // 2. IP Rate Limiting (20 req/min for compute-heavy debugging analysis)
    const rateCheck = await enforceRateLimit(req, "debug");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const body = await req.json();
    const { owner, repo, sha, title, description, stackTrace } = body;

    // 2. Strict Input Validation
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

    // DoS Defense: Bound stack trace size
    if (stackTrace.length > 64000) {
      return NextResponse.json(
        { error: "Stack trace payload exceeds maximum allowed size (64 KB)." },
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

    // 1. Parse Stack Trace
    const parsedTrace = StackTraceParser.parse(stackTrace, repoFilePaths);

    // 2. Fetch snippets for culprit frames concurrently (ensuring frame path is validated)
    const fileSnippets = new Map<string, string>();
    const framesToFetch = parsedTrace.frames
      .filter((f) => validateFilePath(f.filePath))
      .slice(0, 3);

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
      safeTitle,
      safeDesc,
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
