import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OAUTH_CONFIG } from "@/lib/googleAuth";

/**
 * Terminates the authenticated Google session.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/settings";
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
