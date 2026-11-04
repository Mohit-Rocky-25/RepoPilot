import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fallback / Compatibility Route for Demo & Instant Evaluation requests.
 * Safely redirects to the dedicated /login interface preserving returnUrl parameters.
 */
export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") || req.nextUrl.searchParams.get("returnUrl") || "/";
  const loginUrl = new URL("/login", req.nextUrl.origin);
  if (returnTo) {
    loginUrl.searchParams.set("returnUrl", returnTo);
  }
  return NextResponse.redirect(loginUrl);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
