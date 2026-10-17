import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath
} from "@/lib/security";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (60 req/min)
    const clientIp = getClientIp(req);
    const limitCheck = rateLimiter.check(`github:file:${clientIp}`, 60, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const sha = searchParams.get("sha");
    const path = searchParams.get("path");

    if (!owner || !repo || !sha || !path) {
      return NextResponse.json(
        { error: "Missing required parameters: owner, repo, sha, path" },
        { status: 400 }
      );
    }

    // 2. Strict Input Validation (Traversal & SSRF defense)
    if (!validateGitHubOwner(owner) || !validateGitHubRepo(repo)) {
      return NextResponse.json(
        { error: "Invalid repository identifier." },
        { status: 400 }
      );
    }

    if (!validateGitRevision(sha)) {
      return NextResponse.json(
        { error: "Invalid git revision format." },
        { status: 400 }
      );
    }

    if (!validateFilePath(path)) {
      return NextResponse.json(
        { error: "Invalid path traversal attempt." },
        { status: 400 }
      );
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const content = await client.fetchFileContent(owner, repo, sha, path);

    return NextResponse.json({
      success: true,
      path,
      content,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve file content." },
      { status: 500 }
    );
  }
}
