import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OAUTH_CONFIG } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/**
 * Global /api/auth/logout route.
 * Clears the session cookie and either redirects or responds with JSON.
 */
export async function POST(req: NextRequest) {
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/login";
  const wantsRedirect = req.nextUrl.searchParams.get("redirect") === "true";

  let response: NextResponse;
  if (wantsRedirect) {
    response = NextResponse.redirect(new URL(returnUrl, req.nextUrl.origin));
  } else {
    response = NextResponse.json({ success: true, authenticated: false });
  }

  response.cookies.delete(GOOGLE_OAUTH_CONFIG.cookieSessionName);
  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
