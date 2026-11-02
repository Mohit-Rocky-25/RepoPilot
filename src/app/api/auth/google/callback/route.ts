import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleAuthConfigured,
  resolveGoogleRedirectUri,
  getRequestOrigin,
  encodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  GoogleUser,
  GoogleSessionData
} from "@/lib/googleAuth";

/**
 * Handles Google OAuth 2.0 Authorization Callback.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const redirectUri = resolveGoogleRedirectUri(origin);
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // Handle Google OAuth Errors (e.g. access_denied when not added to Test Users)
  if (errorParam) {
    let resolution = "Google authorization was cancelled or denied.";
    if (errorParam === "access_denied") {
      resolution =
        "Google Cloud Consent Screen Error: If your app is in 'Testing' publishing status, you must add your Google email address under 'Test users' in the Google Cloud Console (APIs & Services > OAuth consent screen > Test users).";
    } else if (errorParam === "redirect_uri_mismatch") {
      resolution =
        "Redirect URI Mismatch: Verify that your Authorized redirect URI in Google Cloud Console exactly matches ${redirectUri}";
    }

    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: `Google OAuth Error: ${errorDesc || errorParam}`,
        resolution,
        returnUrl: "/settings"
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: "Missing required authorization code or state from Google.",
        resolution: "Please initiate the login flow again.",
        returnUrl: "/settings"
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  // 1. Verify CSRF State Cookie
  const stateCookie = req.cookies.get(GOOGLE_OAUTH_CONFIG.cookieStateName)?.value;
  if (!stateCookie || !stateCookie.includes(":")) {
    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: "OAuth session expired or missing state cookie.",
        resolution: "Please click Sign in with Google again.",
        returnUrl: "/settings"
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  const [expectedState, codeVerifier, encodedReturnUrl] = stateCookie.split(":");
  const returnUrl = encodedReturnUrl ? decodeURIComponent(encodedReturnUrl) : "/settings";

  if (state !== expectedState) {
    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: "CSRF state verification failed (state mismatch).",
        resolution: "Potential cross-site request forgery detected. Request blocked.",
        returnUrl: "/settings"
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  // 2. Exchange Authorization Code for Google Tokens
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  // redirectUri computed dynamically above

  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: "Server configuration missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.",
        resolution: "Configure Google credentials in .env.local and restart the server.",
        returnUrl: "/settings"
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set("client_id", clientId);
    tokenParams.set("client_secret", clientSecret);
    tokenParams.set("code", code);
    tokenParams.set("code_verifier", codeVerifier);
    tokenParams.set("grant_type", "authorization_code");
    tokenParams.set("redirect_uri", redirectUri);

    const tokenRes = await fetch(GOOGLE_OAUTH_CONFIG.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return new NextResponse(
        renderCallbackHtml({
          success: false,
          error: `Google Token Exchange failed: ${tokenData.error_description || tokenData.error || "Unknown token error"}`,
          resolution: "Ensure your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET match your Google Cloud project.",
          returnUrl
        }),
        {
          status: 502,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    // 3. Fetch Official User Profile from Google OpenID UserInfo
    const userInfoRes = await fetch(GOOGLE_OAUTH_CONFIG.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userInfoRes.ok) {
      return new NextResponse(
        renderCallbackHtml({
          success: false,
          error: "Failed to retrieve user profile from Google UserInfo endpoint.",
          resolution: "Check Google OAuth scopes include 'openid', 'email', and 'profile'.",
          returnUrl
        }),
        {
          status: 502,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    const profile = await userInfoRes.json();
    const user: GoogleUser = {
      id: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      givenName: profile.given_name,
      familyName: profile.family_name,
      picture: profile.picture,
      emailVerified: profile.email_verified
    };

    const sessionData: GoogleSessionData = {
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + GOOGLE_OAUTH_CONFIG.sessionTtlSeconds * 1000
    };

    const signedToken = encodeSignedSession(sessionData);

    // 4. Return Success Response with Signed Session Cookie & Cleared State Cookie
    const response = new NextResponse(
      renderCallbackHtml({
        success: true,
        user,
        returnUrl
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );

    response.cookies.set(GOOGLE_OAUTH_CONFIG.cookieSessionName, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_CONFIG.sessionTtlSeconds
    });

    response.cookies.delete(GOOGLE_OAUTH_CONFIG.cookieStateName);

    return response;
  } catch (err: any) {
    return new NextResponse(
      renderCallbackHtml({
        success: false,
        error: `Unexpected error during authentication: ${err.message || "Network error"}`,
        resolution: "Please check your network and try again.",
        returnUrl
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }
}

function renderCallbackHtml(props: {
  success: boolean;
  user?: GoogleUser;
  error?: string;
  resolution?: string;
  returnUrl?: string;
}): string {
  const safeUser = JSON.stringify(props.user || null);
  const safeReturnUrl = JSON.stringify(props.returnUrl || "/settings");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RepoPilot &mdash; Google Authentication</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      background-color: #0A0D14;
      color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #111624;
      border: 1px solid #1E273D;
      border-radius: 16px;
      padding: 32px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    }
    .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .success { background: rgba(34, 197, 94, 0.15); color: #22C55E; }
    .error { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
    h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 13px; color: #94A3B8; margin: 0 0 16px; line-height: 1.5; }
    .res-box {
      background: #0B0E17;
      border: 1px solid #1C2438;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      color: #CBD5E1;
      text-align: left;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      background: #3B82F6;
      color: #FFFFFF;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .btn:hover { background: #2563EB; }
  </style>
</head>
<body>
  <div class="card">
    ${
      props.success
        ? `
      <div class="icon success">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1>Google Authentication Successful</h1>
      <p>Signed in as <strong>${props.user?.email || "Google User"}</strong>. Redirecting back to RepoPilot...</p>
    `
        : `
      <div class="icon error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1>Authentication Failed</h1>
      <p>${props.error || "Unable to complete Google authentication."}</p>
      ${props.resolution ? `<div class="res-box"><strong>Resolution:</strong><br/>${props.resolution}</div>` : ""}
      <a href="${props.returnUrl || "/settings"}" class="btn">Return to Settings</a>
    `
    }
  </div>

  <script>
    (function() {
      const isSuccess = ${props.success};
      const user = ${safeUser};
      const returnUrl = ${safeReturnUrl};

      if (isSuccess && user) {
        try {
          sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(user));
        } catch (e) {}

        // Small delay so user sees success confirmation, then redirect
        setTimeout(function() {
          window.location.href = returnUrl;
        }, 1000);
      }
    })();
  </script>
</body>
</html>`;
}
