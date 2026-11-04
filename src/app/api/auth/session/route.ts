import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleAuthConfigured,
  decodeSignedSession,
  GOOGLE_OAUTH_CONFIG
} from "@/lib/googleAuth";
import { getSupabaseConfig } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * Global /api/auth/session route.
 * Returns the active user session and auth configuration status.
 */
export async function GET(req: NextRequest) {
  const configured = isGoogleAuthConfigured() || getSupabaseConfig().isConfigured;
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
