import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision
} from "@/lib/security";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (45 req/min)
    const clientIp = getClientIp(req);
    const limitCheck = rateLimiter.check(`architecture:${clientIp}`, 45, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { owner, repo, sha } = body;

    // 2. Strict Input Validation
    if (!validateGitHubOwner(owner) || !validateGitHubRepo(repo)) {
      return NextResponse.json(
        { error: "Invalid repository identifier. Owner and repo must be valid alphanumeric names." },
        { status: 400 }
      );
    }

    if (sha && !validateGitRevision(sha)) {
      return NextResponse.json(
        { error: "Invalid git revision or commit SHA format." },
        { status: 400 }
      );
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const tree = await client.fetchTree(owner, repo, sha || "HEAD");

    // Attempt to load package.json or requirements.txt if present
    let manifestContent: string | undefined;
    const manifestFile = tree.find(
      (f) => f.path === "package.json" || f.path === "requirements.txt" || f.path === "go.mod"
    );

    if (manifestFile) {
      try {
        manifestContent = await client.fetchFileContent(
          owner,
          repo,
          sha || "HEAD",
          manifestFile.path
        );
      } catch (e) {
        // Continue even if manifest retrieval fails
      }
    }

    const summary = ArchitectureAnalyzer.analyze(tree, manifestContent);
    const graph = ArchitectureAnalyzer.generateGraph(tree, `${owner}/${repo}`);

    return NextResponse.json({
      success: true,
      summary,
      graph,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Architecture analysis failed." },
      { status: 500 }
    );
  }
}
