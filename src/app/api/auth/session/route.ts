import { NextRequest } from "next/server";
import { GET as sessionGet, dynamic as sessionDynamic } from "../google/session/route";

export const dynamic = sessionDynamic;

/**
 * Global /api/auth/session alias route delegating to google/session.
 */
export async function GET(req: NextRequest) {
  return sessionGet(req);
}
