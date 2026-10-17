import { NextRequest, NextResponse } from "next/server";
import { SearchEngine } from "@repopilot/search";
import { SearchQuerySchema } from "@repopilot/core";
import { GitHubClient } from "@repopilot/github";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath
} from "@/lib/security";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (60 req/min)
    const clientIp = getClientIp(req);
    const limitCheck = rateLimiter.check(`search:${clientIp}`, 60, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { owner, repo, sha, query, type, language, pathPrefix } = body;

    // 2. Strict Input Validation
    if (!validateGitHubOwner(owner) || !validateGitHubRepo(repo)) {
      return NextResponse.json(
        { error: "Invalid repository identifier. Owner and repo must be alphanumeric." },
        { status: 400 }
      );
    }

    if (sha && !validateGitRevision(sha)) {
      return NextResponse.json(
        { error: "Invalid git revision or commit SHA format." },
        { status: 400 }
      );
    }

    if (pathPrefix && !validateFilePath(pathPrefix)) {
      return NextResponse.json(
        { error: "Invalid pathPrefix traversal sequence." },
        { status: 400 }
      );
    }

    const validatedQuery = SearchQuerySchema.parse({
      query: typeof query === "string" ? query.slice(0, 256) : "",
      type: type || "all",
      language,
      pathPrefix
    });

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const tree = await client.fetchTree(owner, repo, sha || "HEAD");

    const engine = new SearchEngine({
      files: tree,
      symbols: []
    });

    const results = engine.search(validatedQuery);

    return NextResponse.json({
      success: true,
      query: validatedQuery.query,
      results,
      count: results.length,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Search failed." },
      { status: 500 }
    );
  }
}
