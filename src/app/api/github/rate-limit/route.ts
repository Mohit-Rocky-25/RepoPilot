import { NextRequest, NextResponse } from "next/server";
import { GitHubClient } from "@repopilot/github";

export async function GET(req: NextRequest) {
  try {
    const clientToken = req.headers.get("x-github-token");
    const hasUserToken = Boolean(clientToken && clientToken.trim());
    const token = hasUserToken ? clientToken : process.env.GITHUB_TOKEN;

    const client = new GitHubClient({ token: token || undefined });
    const status = await client.checkRateLimit();

    // PRIVACY & SECURITY SHIELD:
    // Only expose user identity (@username) if the client provided their OWN personal access token.
    // Never leak the server owner's GitHub username to random public visitors on the internet.
    return NextResponse.json({
      success: true,
      rateLimit: status.rateLimit,
      authenticated: hasUserToken ? status.authenticated : false,
      user: hasUserToken ? status.user : undefined,
      mode: hasUserToken ? "personal-token" : "public-tier"
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
