import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl, GitHubClient } from "@repopilot/github";
import { enforceRateLimit } from "@/lib/rateLimiter";
import { sanitizeErrorMessage } from "@/lib/security";
import { z } from "zod";

// Configures maximum execution budget for serverless runtimes (60 seconds)
export const maxDuration = 60;

const ImportRequestSchema = z.object({
  url: z.string().trim().min(1).max(256),
  subfolder: z.string().trim().max(256).optional()
});

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (15 req/min ingest limit)
    const rateCheck = await enforceRateLimit(req, "ingest");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const body = await req.json();
    const { url, subfolder } = ImportRequestSchema.parse(body);

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

    // 3. Compute skipped files report & filter by subfolder if requested
    const cleanSubfolder = subfolder ? subfolder.trim().replace(/^\/+|\/+$/g, "") : null;
    let filteredTree = tree;
    if (cleanSubfolder) {
      filteredTree = tree.filter(
        (f) => f.path === cleanSubfolder || f.path.startsWith(cleanSubfolder + "/")
      );
    }

    // Categorize skipped files
    let binaryCount = 0;
    let tooLargeCount = 0;
    for (const f of filteredTree) {
      if (f.isBinary) binaryCount++;
      if (f.size > 100 * 1024) tooLargeCount++;
    }

    const skippedReport = {
      totalSkipped: binaryCount + tooLargeCount,
      tooLarge: tooLargeCount,
      binary: binaryCount,
      ignoredDirectory: 0,
      overFileCap: Math.max(0, tree.length - 1500)
    };

    return NextResponse.json({
      success: true,
      repository: {
        ...repository,
        selectedRevision: revision.commitSha
      },
      revision,
      tree: filteredTree,
      skippedReport,
      rateLimit: client.lastRateLimit
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error.message, "Failed to import repository.")
      },
      { status: error.status || 400 }
    );
  }
}
