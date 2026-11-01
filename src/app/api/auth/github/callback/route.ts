import { NextRequest, NextResponse } from "next/server";
import { isOAuthEnabled } from "@/lib/featureFlags";
import { safeGitHubFetch } from "@repopilot/github";

/**
 * Handles GitHub App OAuth 2.0 Authorization Callback.
 *
 * Feature-Flagged: Disabled by default (ENABLE_GITHUB_APP_OAUTH=false).
 * Policy: ZERO SERVER-SIDE PERSISTENCE.
 * The access token received from GitHub is handed off exclusively to the client
 * browser's sessionStorage and NEVER written to disk, database, or server cache.
 */
export async function GET(req: NextRequest) {
  if (!isOAuthEnabled()) {
    return NextResponse.json(
      {
        error: "GitHub App OAuth is disabled by default. Set ENABLE_GITHUB_APP_OAUTH=true in environment to enable.",
        enabled: false
      },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (errorParam) {
    return new NextResponse(
      renderCallbackHtml(
        false,
        "",
        `GitHub Authorization Error: ${errorDesc || errorParam}`
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      renderCallbackHtml(false, "", "Missing required OAuth code or state parameter."),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  // Retrieve cryptographic cookie
  const cookieState = req.cookies.get("repopilot_oauth_state")?.value;
  if (!cookieState || !cookieState.includes(":")) {
    return new NextResponse(
      renderCallbackHtml(
        false,
        "",
        "OAuth state session expired or missing cookie. Please try authenticating again."
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  const [expectedState, codeVerifier] = cookieState.split(":");

  // Constant-time-like comparison of state to prevent timing attacks
  if (state !== expectedState) {
    return new NextResponse(
      renderCallbackHtml(
        false,
        "",
        "CSRF verification failed: OAuth state mismatch. Request blocked."
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderCallbackHtml(
        false,
        "",
        "Server configuration error: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing."
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }

  const redirectUri = new URL("/api/auth/github/callback", req.nextUrl.origin).toString();

  try {
    const tokenRes = await safeGitHubFetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "RepoPilot-OSS-Client/1.0"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri
        })
      },
      10000
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return new NextResponse(
        renderCallbackHtml(
          false,
          "",
          `OAuth token exchange failed: ${tokenData.error_description || tokenData.error || "Unknown error"}`
        ),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new NextResponse(
        renderCallbackHtml(false, "", "No access_token returned by GitHub OAuth provider."),
        {
          status: 502,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    // Prepare response delivering token exclusively to browser's sessionStorage
    const response = new NextResponse(renderCallbackHtml(true, accessToken), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

    // Clear state cookie
    response.cookies.delete("repopilot_oauth_state");

    return response;
  } catch (err: any) {
    return new NextResponse(
      renderCallbackHtml(false, "", `Token exchange exception: ${err.message || "Network error"}`),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }
}

function renderCallbackHtml(success: boolean, token = "", error = ""): string {
  const safeToken = JSON.stringify(token);
  const safeError = JSON.stringify(error);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RepoPilot GitHub Authorization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      background-color: #0F1011;
      color: #F7F8F8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #141516;
      border: 1px solid #23252A;
      border-radius: 8px;
      padding: 24px;
      max-width: 440px;
      text-align: center;
    }
    .success { color: #27A644; }
    .error { color: #EF4444; }
    p { font-size: 13px; color: #8A8F98; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    ${
      success
        ? `<h3 class="success">&#10003; Authorization Succeeded</h3>
           <p>Handing off temporary session token strictly to your browser tab...</p>`
        : `<h3 class="error">&#9888; Authorization Failed</h3>
           <p>${escapeHtml(error)}</p>
           <p><a href="/settings" style="color: #828FFF;">Return to Settings</a></p>`
    }
  </div>

  <script>
    (function() {
      const isSuccess = ${success};
      const token = ${safeToken};
      const errorMsg = ${safeError};

      if (isSuccess && token) {
        try {
          sessionStorage.setItem("REPOPILOT_GH_TOKEN", token);
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: "REPOPILOT_OAUTH_TOKEN", token: token },
              window.location.origin
            );
            window.close();
            return;
          }
          window.location.href = "/settings?auth=success";
        } catch (e) {
          window.location.href = "/settings?error=storage_denied";
        }
      }
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
