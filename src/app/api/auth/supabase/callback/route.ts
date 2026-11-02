import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  encodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  GoogleUser,
  GoogleSessionData
} from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/**
 * Handles OAuth callback when signing in via Supabase Google OAuth.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/";

  if (code) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
          const user: GoogleUser = {
            id: data.user.id,
            email: data.user.email || "user@google.com",
            name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split("@")[0] ||
              "Google User",
            givenName:
              data.user.user_metadata?.given_name ||
              data.user.user_metadata?.name?.split(" ")[0] ||
              "User",
            picture:
              data.user.user_metadata?.avatar_url ||
              data.user.user_metadata?.picture,
            emailVerified: Boolean(data.user.email_confirmed_at)
          };

          const sessionData: GoogleSessionData = {
            user,
            createdAt: Date.now(),
            expiresAt: Date.now() + GOOGLE_OAUTH_CONFIG.sessionTtlSeconds * 1000
          };

          const token = encodeSignedSession(sessionData);
          const response = NextResponse.redirect(new URL(returnUrl, req.nextUrl.origin));
          response.cookies.set(GOOGLE_OAUTH_CONFIG.cookieSessionName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: GOOGLE_OAUTH_CONFIG.sessionTtlSeconds
          });
          return response;
        }
      } catch (err) {
        console.error("Supabase code exchange error:", err);
      }
    }
  }

  return NextResponse.redirect(new URL(returnUrl, req.nextUrl.origin));
}
