import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getUserFromRequest } from "@/lib/auth";
import type { WorkspaceSnapshot } from "@/lib/workspaceStore";

// In-memory server cache per user for high-speed serverless responses
const memoryUserStores: Record<string, WorkspaceSnapshot[]> = {};

function getUserDataDir(userId: string): string {
  // Sanitize userId to prevent directory traversal
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseDir = path.join(process.cwd(), ".repopilot", "data", "users", safeId);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

function getStoredUserSnapshots(userId: string): WorkspaceSnapshot[] {
  if (memoryUserStores[userId]) {
    return memoryUserStores[userId];
  }

  try {
    const filePath = path.join(getUserDataDir(userId), "snapshots.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryUserStores[userId] = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[Workspaces API] Could not read snapshots for user ${userId}:`, err);
  }

  memoryUserStores[userId] = [];
  return [];
}

function persistUserSnapshots(userId: string, snapshots: WorkspaceSnapshot[]): void {
  memoryUserStores[userId] = snapshots;
  try {
    const filePath = path.join(getUserDataDir(userId), "snapshots.json");
    fs.writeFileSync(filePath, JSON.stringify(snapshots, null, 2), "utf8");
  } catch (err) {
    console.warn(`[Workspaces API] Could not write snapshots for user ${userId}:`, err);
  }
}

/**
 * GET /api/workspaces - Retrieve user's cloud-synced snapshots
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to access cloud workspaces" },
      { status: 401 }
    );
  }

  const snapshots = getStoredUserSnapshots(user.id);
  return NextResponse.json({
    success: true,
    userId: user.id,
    snapshots,
    count: snapshots.length,
    syncedAt: new Date().toISOString()
  });
}

/**
 * POST /api/workspaces - Upsert snapshots for authenticated user
 * Accepts { snapshot: WorkspaceSnapshot } or { snapshots: WorkspaceSnapshot[] }
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to sync workspaces" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const incoming: WorkspaceSnapshot[] = Array.isArray(body.snapshots)
      ? body.snapshots
      : body.snapshot
      ? [body.snapshot]
      : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { error: "No snapshots provided in request body" },
        { status: 400 }
      );
    }

    const current = getStoredUserSnapshots(user.id);
    const map = new Map<string, WorkspaceSnapshot>();

    // Add current
    current.forEach((s) => map.set(s.id, s));

    // Upsert incoming with conflict resolution (latest updatedAt wins)
    incoming.forEach((s) => {
      if (!s.id || !s.repoFullName) return;
      const existing = map.get(s.id);
      if (!existing || new Date(s.updatedAt) >= new Date(existing.updatedAt)) {
        map.set(s.id, s);
      }
    });

    const updated = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    persistUserSnapshots(user.id, updated);

    return NextResponse.json({
      success: true,
      count: updated.length,
      snapshots: updated,
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process snapshot sync" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces?id=<snapshotId> - Remove a snapshot from cloud
 */
export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing required 'id' parameter" },
      { status: 400 }
    );
  }

  const current = getStoredUserSnapshots(user.id);
  const updated = current.filter((s) => s.id !== id);

  persistUserSnapshots(user.id, updated);

  return NextResponse.json({
    success: true,
    deletedId: id,
    remainingCount: updated.length
  });
}
