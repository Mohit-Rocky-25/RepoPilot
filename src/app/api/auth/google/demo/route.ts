import { NextRequest, NextResponse } from "next/server";
import { signSessionToken, SESSION_COOKIE_NAME, AuthUser } from "@/lib/auth";

/**
 * 1-Click Demo / Evaluation Authentication Route
 *
 * Enables frictionless testing and review of the authenticated user workflow
 * and cloud sync without requiring Google Cloud Console OAuth setup upfront.
 */
export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/history";
  const email = req.nextUrl.searchParams.get("email") || "developer@repopilot.local";
  const name = req.nextUrl.searchParams.get("name") || "RepoPilot Developer";

  const demoUser: AuthUser = {
    id: "demo_usr_" + Buffer.from(email).toString("hex").slice(0, 12),
    email,
    name,
    picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
    provider: "demo"
  };

  const sessionToken = signSessionToken(demoUser);

  const redirectUrl = new URL(returnTo, req.nextUrl.origin);
  redirectUrl.searchParams.set("auth", "success");
  redirectUrl.searchParams.set("demo", "true");

  const response = NextResponse.redirect(redirectUrl.toString());

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600
  });

  return response;
}

