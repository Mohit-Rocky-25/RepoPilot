import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleAuthConfigured,
  decodeSignedSession,
  GOOGLE_OAUTH_CONFIG
} from "@/lib/googleAuth";

/**
 * Returns the current authenticated Google user session state.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const configured = isGoogleAuthConfigured();
  const sessionCookie = req.cookies.get(GOOGLE_OAUTH_CONFIG.cookieSessionName)?.value;

  if (!sessionCookie) {
    return NextResponse.json({
      authenticated: false,
      configured,
      user: null
    });
  }

  const session = decodeSignedSession(sessionCookie);
  if (!session || !session.user) {
    const res = NextResponse.json({
      authenticated: false,
      configured,
      user: null
    });
    res.cookies.delete(GOOGLE_OAUTH_CONFIG.cookieSessionName);
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    configured,
    user: session.user
  });
}
