import { NextRequest, NextResponse } from "next/server";
import { parseGitHubUrl, GitHubClient } from "@repopilot/github";
import { enforceRateLimit } from "@/lib/rateLimiter";
import { sanitizeErrorMessage } from "@/lib/security";
import { serverIndexCache } from "@/lib/serverIndexCache";
import { z } from "zod";

// Configures maximum execution budget for serverless runtimes (60 seconds)
export const maxDuration = 60;

const ImportRequestSchema = z.object({
  url: z.string().trim().min(1).max(256),
  sha: z.string().trim().max(128).optional(),
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
    const { url, sha, subfolder } = ImportRequestSchema.parse(body);

    const { owner, repo } = parseGitHubUrl(url);

    // Fast-path: Check server index cache if explicit commit SHA was provided
    if (sha) {
      const cached = serverIndexCache.get(owner, repo, sha, subfolder);
      if (cached) {
        return NextResponse.json({
          success: true,
          repository: cached.repository,
          revision: cached.revision,
          tree: cached.tree,
          skippedReport: cached.skippedReport,
          cached: true
        });
      }
    }

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });

    // 1. Fetch Repository Metadata and Head Revision concurrently
    const [repository, targetRevision] = await Promise.all([
      client.fetchRepository(owner, repo),
      sha
        ? client.resolveRevision(owner, repo, sha).catch(() => null)
        : client.resolveRevision(owner, repo, "HEAD").catch(() => null)
    ]);

    // If revision resolution did not succeed, resolve using repository's default branch
    const revision =
      targetRevision ||
      (await client.resolveRevision(owner, repo, sha || repository.defaultBranch));

    // Check server index cache with resolved commit SHA
    const cleanSubfolder = subfolder ? subfolder.trim().replace(/^\/+|\/+$/g, "") : null;
    const cachedBySha = serverIndexCache.get(
      owner,
      repo,
      revision.commitSha,
      cleanSubfolder || undefined
    );
    if (cachedBySha) {
      return NextResponse.json({
        success: true,
        repository: cachedBySha.repository,
        revision: cachedBySha.revision,
        tree: cachedBySha.tree,
        skippedReport: cachedBySha.skippedReport,
        rateLimit: client.lastRateLimit,
        cached: true
      });
    }

    // 2. Fetch Repository Tree
    const tree = await client.fetchTree(owner, repo, revision.treeSha);

    // 3. Compute skipped files report & filter by subfolder if requested
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

    const repoData = {
      repository: {
        ...repository,
        selectedRevision: revision.commitSha
      },
      revision,
      tree: filteredTree,
      skippedReport
    };

    // Store in server-side index cache
    serverIndexCache.set(
      owner,
      repo,
      revision.commitSha,
      repoData,
      cleanSubfolder || undefined
    );

    return NextResponse.json({
      success: true,
      ...repoData,
      rateLimit: client.lastRateLimit,
      cached: false
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
