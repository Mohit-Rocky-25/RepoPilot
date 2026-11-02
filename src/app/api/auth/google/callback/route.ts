import { NextRequest, NextResponse } from "next/server";
import {
  signSessionToken,
  SESSION_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE,
  AuthUser
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  let returnTo = "/history";

  if (cookieState && cookieState.split(":").length >= 3) {
    try {
      returnTo = decodeURIComponent(cookieState.split(":")[2]) || "/history";
    } catch {}
  }

  const redirectTarget = new URL(returnTo, req.nextUrl.origin);

  if (errorParam) {
    redirectTarget.searchParams.set("auth_error", `Google Auth: ${errorParam}`);
    return NextResponse.redirect(redirectTarget.toString());
  }

  if (!code || !state || !cookieState) {
    redirectTarget.searchParams.set("auth_error", "Missing authorization code or state session expired.");
    return NextResponse.redirect(redirectTarget.toString());
  }

  const [expectedState, codeVerifier] = cookieState.split(":");

  if (state !== expectedState) {
    redirectTarget.searchParams.set("auth_error", "State verification mismatch (CSRF protection blocked).");
    return NextResponse.redirect(redirectTarget.toString());
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    redirectTarget.searchParams.set("auth_error", "Server missing Google OAuth credentials.");
    return NextResponse.redirect(redirectTarget.toString());
  }

  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();

  try {
    // 1. Exchange authorization code with Google Token endpoint
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      redirectTarget.searchParams.set(
        "auth_error",
        tokenData.error_description || tokenData.error || "Failed to exchange token with Google."
      );
      return NextResponse.redirect(redirectTarget.toString());
    }

    // 2. Fetch authenticated profile from Google UserInfo endpoint
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
      redirectTarget.searchParams.set("auth_error", "Failed to retrieve Google user profile.");
      return NextResponse.redirect(redirectTarget.toString());
    }

    const profile = await profileRes.json();

    const authUser: AuthUser = {
      id: profile.sub || `google_${Date.now()}`,
      email: profile.email || "developer@example.com",
      name: profile.name || profile.email?.split("@")[0] || "Developer",
      picture: profile.picture,
      provider: "google"
    };

    const sessionToken = signSessionToken(authUser);

    redirectTarget.searchParams.set("auth", "success");
    const response = NextResponse.redirect(redirectTarget.toString());

    // 3. Set persistent HttpOnly session cookie (30 days)
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 3600
    });

    // Clear state cookie
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);

    return response;
  } catch (err: any) {
    redirectTarget.searchParams.set("auth_error", err.message || "Network exception during Google login.");
    return NextResponse.redirect(redirectTarget.toString());
  }
}
