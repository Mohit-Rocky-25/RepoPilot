import { NextRequest, NextResponse } from "next/server";
import { SearchEngine } from "@repopilot/search";
import { SearchQuerySchema } from "@repopilot/core";
import { GitHubClient } from "@repopilot/github";
import { extractSymbols } from "@repopilot/indexer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { owner, repo, sha, query, type, language, pathPrefix } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: "owner and repo are required." }, { status: 400 });
    }

    const validatedQuery = SearchQuerySchema.parse({
      query,
      type: type || "all",
      language,
      pathPrefix
    });

    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });
    const tree = await client.fetchTree(owner, repo, sha || "HEAD");

    // Extract symbols from matching or key files
    const symbols = [];
    for (const file of tree.slice(0, 100)) {
      if (file.type === "blob" && !file.isBinary && file.language) {
        // Can extract symbols if we have or fetch snippet
      }
    }

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
