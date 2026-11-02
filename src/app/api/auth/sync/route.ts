import { NextRequest, NextResponse } from "next/server";
import {
  encodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  GoogleUser,
  GoogleSessionData
} from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/**
 * Syncs an authenticated client session (e.g. from Supabase Google Auth)
 * into an HttpOnly signed cookie for server-side session persistence.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await req.json();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Invalid user object" }, { status: 400 });
    }

    const sessionData: GoogleSessionData = {
      user: {
        id: user.id || `user-${Date.now()}`,
        email: user.email,
        name: user.name || user.email.split("@")[0],
        givenName: user.givenName || user.name?.split(" ")[0],
        picture: user.picture,
        emailVerified: Boolean(user.emailVerified)
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + GOOGLE_OAUTH_CONFIG.sessionTtlSeconds * 1000
    };

    const token = encodeSignedSession(sessionData);
    const response = NextResponse.json({ success: true, user: sessionData.user });

    response.cookies.set(GOOGLE_OAUTH_CONFIG.cookieSessionName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_CONFIG.sessionTtlSeconds
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to sync session" }, { status: 500 });
  }
}
