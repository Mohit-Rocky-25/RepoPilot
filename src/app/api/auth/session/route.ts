import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, isGoogleAuthConfigured } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);

  return NextResponse.json({
    authenticated: Boolean(user),
    user: user || null,
    isGoogleConfigured: isGoogleAuthConfigured()
  });
}

