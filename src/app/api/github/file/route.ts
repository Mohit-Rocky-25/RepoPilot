import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";
import {
  validateGitHubOwner,
  validateGitHubRepo,
  validateGitRevision,
  validateFilePath,
  sanitizeErrorMessage
} from "@/lib/security";
import { enforceRateLimit } from "@/lib/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (60 req/min)
    const rateCheck = await enforceRateLimit(req, "general");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    let sha = searchParams.get("sha")?.trim();
    const path = searchParams.get("path");

    // Default sha to HEAD if empty, missing, or literal undefined/null string
    if (!sha || sha === "undefined" || sha === "null") {
      sha = "HEAD";
    }

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: "Missing required parameters: owner, repo, path" },
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
      { error: sanitizeErrorMessage(error.message, "Failed to retrieve file content.") },
      { status: 500 }
    );
  }
}
