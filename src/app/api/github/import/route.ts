import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl, GitHubClient } from "@repopilot/github";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";
import { z } from "zod";

const ImportRequestSchema = z.object({
  url: z.string().trim().min(1).max(256)
});

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (30 req/min)
    const clientIp = getClientIp(req);
    const limitCheck = rateLimiter.check(`github:import:${clientIp}`, 30, 60000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { url } = ImportRequestSchema.parse(body);

    const { owner, repo } = parseGitHubUrl(url);

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });

    // 1. Fetch Repository Metadata and Head Revision concurrently
    const [repository, headRevision] = await Promise.all([
      client.fetchRepository(owner, repo),
      client.resolveRevision(owner, repo, "HEAD").catch(() => null)
    ]);

    // If HEAD resolution did not succeed, resolve using repository's default branch
    const revision = headRevision || (await client.resolveRevision(owner, repo, repository.defaultBranch));

    // 2. Fetch Repository Tree
    const tree = await client.fetchTree(owner, repo, revision.treeSha);

    return NextResponse.json({
      success: true,
      repository: {
        ...repository,
        selectedRevision: revision.commitSha
      },
      revision,
      tree,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    console.error("API /api/github/import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to import repository."
      },
      { status: error.status || 400 }
    );
  }
}
