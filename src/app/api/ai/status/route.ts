import { NextRequest, NextResponse } from "next/server";
import { OllamaClient } from "@repopilot/ai";
import { validateOllamaEndpoint } from "@/lib/security";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";

export async function GET(req: NextRequest) {
  // 1. IP Rate Limiting (60 req/min)
  const clientIp = getClientIp(req);
  const limitCheck = rateLimiter.check(`ai:status:${clientIp}`, 60, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { isAvailable: false, models: [], error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds} seconds.` },
      { status: 429 }
    );
  }

  // 2. SSRF Protection: Validate baseUrl
  const { searchParams } = new URL(req.url);
  const rawBaseUrl = searchParams.get("baseUrl") || "http://localhost:11434";
  const validation = validateOllamaEndpoint(rawBaseUrl);

  if (!validation.valid) {
    return NextResponse.json(
      { isAvailable: false, models: [], error: validation.reason || "Invalid or prohibited AI endpoint (SSRF defense)." },
      { status: 400 }
    );
  }

  const client = new OllamaClient(rawBaseUrl);
  const status = await client.checkStatus();

  return NextResponse.json(status);
}
