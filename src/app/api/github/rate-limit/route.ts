import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("x-github-token") || process.env.GITHUB_TOKEN;
    const client = new GitHubClient({ token });

    const status = await client.checkRateLimit();

    return NextResponse.json({
      success: true,
      rateLimit: status.rateLimit,
      authenticated: status.authenticated,
      user: status.user
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check GitHub rate limit."
      },
      { status: error.status || 500 }
    );
  }
}
