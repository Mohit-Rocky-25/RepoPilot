import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, getSupabaseConfig } from "@/lib/supabaseClient";
import {
  encodeSignedSession,
  GOOGLE_OAUTH_CONFIG,
  GoogleUser,
  GoogleSessionData
} from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

/**
 * Handles OAuth callback when signing in via Supabase Google OAuth.
 * Supports both server-side PKCE code exchange and client-side hash/session exchange.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/";
  const supabaseConfig = getSupabaseConfig();

  // 1. Try server-side code exchange if code is present
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

          const response = new NextResponse(
            renderCallbackHtml({
              status: "server_success",
              user,
              returnUrl,
              supabaseUrl: supabaseConfig.url,
              supabaseAnonKey: supabaseConfig.anonKey
            }),
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            }
          );

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
        // Fall through to client-side callback handling (e.g. PKCE verifier stored in browser)
        console.warn("Supabase server exchange skipped, proceeding to client exchange:", err);
      }
    }
  }

  // 2. Render client-side callback processor for browser-held PKCE code or URL hash tokens
  return new NextResponse(
    renderCallbackHtml({
      status: "client_exchange",
      returnUrl,
      supabaseUrl: supabaseConfig.url,
      supabaseAnonKey: supabaseConfig.anonKey
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

function renderCallbackHtml(props: {
  status: "server_success" | "client_exchange";
  user?: GoogleUser;
  returnUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}): string {
  const safeUser = JSON.stringify(props.user || null);
  const safeReturnUrl = JSON.stringify(props.returnUrl || "/");
  const safeSupabaseUrl = JSON.stringify(props.supabaseUrl || "");
  const safeSupabaseAnonKey = JSON.stringify(props.supabaseAnonKey || "");
  const isServerSuccess = props.status === "server_success";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RepoPilot &mdash; Completing Sign In</title>
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
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    }
    .spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .success-icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(34, 197, 94, 0.15);
      color: #22C55E;
    }
    .error-icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 13px; color: #94A3B8; margin: 0 0 16px; line-height: 1.5; }
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
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
  <div class="card" id="card">
    ${
      isServerSuccess
        ? `
      <div class="success-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1>Sign-in Successful</h1>
      <p>Signed in as <strong>${props.user?.email || "Google User"}</strong>. Redirecting to your workspace...</p>
    `
        : `
      <div class="spinner" id="spinner"></div>
      <h1 id="title">Signing in with Google...</h1>
      <p id="desc">Connecting your Google session securely with RepoPilot.</p>
    `
    }
  </div>

  <script>
    (async function() {
      const isServerSuccess = ${isServerSuccess};
      const initialUser = ${safeUser};
      const returnUrl = ${safeReturnUrl};
      const supabaseUrl = ${safeSupabaseUrl};
      const supabaseAnonKey = ${safeSupabaseAnonKey};

      // 1. If server already resolved user, persist and redirect immediately
      if (isServerSuccess && initialUser) {
        try {
          sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(initialUser));
        } catch (e) {}
        setTimeout(function() {
          window.location.replace(returnUrl);
        }, 500);
        return;
      }

      // 2. Client-side token/code resolution via Supabase JS
      const card = document.getElementById("card");
      const title = document.getElementById("title");
      const desc = document.getElementById("desc");

      try {
        let activeSupabase = null;
        if (window.supabase && supabaseUrl && supabaseAnonKey) {
          activeSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: true,
              detectSessionInUrl: true
            }
          });
        }

        let userSession = null;

        // Try getting session from Supabase client (detectSessionInUrl handles hash & code automatically)
        if (activeSupabase) {
          const { data, error } = await activeSupabase.auth.getSession();
          if (!error && data && data.session && data.session.user) {
            userSession = data.session.user;
          }
        }

        // If not found yet, check if access_token is in URL hash directly
        if (!userSession && window.location.hash.includes("access_token")) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          if (accessToken && supabaseUrl && supabaseAnonKey) {
            const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
              headers: {
                Authorization: "Bearer " + accessToken,
                apikey: supabaseAnonKey
              }
            });
            if (userRes.ok) {
              userSession = await userRes.json();
            }
          }
        }

        if (userSession) {
          const formattedUser = {
            id: userSession.id,
            email: userSession.email || "user@google.com",
            name: (userSession.user_metadata && (userSession.user_metadata.full_name || userSession.user_metadata.name)) || (userSession.email ? userSession.email.split("@")[0] : "Google User"),
            givenName: (userSession.user_metadata && userSession.user_metadata.given_name) || "User",
            picture: userSession.user_metadata && (userSession.user_metadata.avatar_url || userSession.user_metadata.picture),
            emailVerified: Boolean(userSession.email_confirmed_at)
          };

          // Sync session to server cookie
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: formattedUser })
          }).catch(function() {});

          try {
            sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(formattedUser));
          } catch (e) {}

          card.innerHTML = [
            '<div class="success-icon">',
            '  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
            '    <polyline points="20 6 9 17 4 12" />',
            '  </svg>',
            '</div>',
            '<h1>Sign-in Successful</h1>',
            '<p>Signed in as <strong>' + (formattedUser.email || "Google User") + '</strong>. Redirecting...</p>'
          ].join("");

          setTimeout(function() {
            window.location.replace(returnUrl);
          }, 600);
        } else {
          // If no tokens found, redirect to returnUrl or login
          window.location.replace(returnUrl);
        }
      } catch (err) {
        console.error("Client callback error:", err);
        card.innerHTML = [
          '<div class="error-icon">',
          '  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
          '    <circle cx="12" cy="12" r="10" />',
          '    <line x1="12" y1="8" x2="12" y2="12" />',
          '    <line x1="12" y1="16" x2="12.01" y2="16" />',
          '  </svg>',
          '</div>',
          '<h1>Authentication Pending</h1>',
          '<p>Unable to automatically verify credentials. Please sign in again.</p>',
          '<a href="/login" class="btn">Return to Login</a>'
        ].join("");
      }
    })();
  </script>
</body>
</html>`;
}
