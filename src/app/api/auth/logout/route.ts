import { NextRequest } from "next/server";
import { POST as logoutPost, GET as logoutGet, dynamic as logoutDynamic } from "../google/logout/route";

export const dynamic = logoutDynamic;

/**
 * Global /api/auth/logout alias route delegating to google/logout.
 */
export async function POST(req: NextRequest) {
  return logoutPost(req);
}

export async function GET(req: NextRequest) {
  return logoutGet(req);
}
