import { NextRequest, NextResponse } from "next/server";
import { validateGitHubToken } from "@repopilot/github";
import { enforceRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await enforceRateLimit(req, "general");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    let token = req.headers.get("x-github-token")?.trim();
    if (!token) {
      try {
        const body = await req.json();
        token = body.token?.trim();
      } catch {
        // Body was empty or not JSON
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No token provided. Please supply token via x-github-token header or JSON body."
        },
        { status: 400 }
      );
    }

    const result = await validateGitHubToken(token);
    return NextResponse.json({
      success: result.valid,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate GitHub token."
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const rateCheck = await enforceRateLimit(req, "general");
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const token = req.headers.get("x-github-token")?.trim();
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No token provided in x-github-token header."
        },
        { status: 400 }
      );
    }

    const result = await validateGitHubToken(token);
    return NextResponse.json({
      success: result.valid,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate GitHub token."
      },
      { status: 500 }
    );
  }
}
