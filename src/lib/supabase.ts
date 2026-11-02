/**
 * Supabase Client & Local Storage Adapter for RepoPilot
 *
 * Configures the official @supabase/supabase-js client.
 * Seamlessly connects to:
 * 1. Local Supabase Storage Engine (http://localhost:3000/api/supabase) by default.
 * 2. Remote Supabase Cloud instance when NEXT_PUBLIC_SUPABASE_URL & ANON_KEY are set.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceSnapshot } from "./workspaceStore";

export const LOCAL_SUPABASE_DEFAULT_URL = "http://localhost:3000/api/supabase";
export const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.repopilot-local-storage-anon-key";

export const SUPABASE_BUCKET_WORKSPACES = "workspaces";

let clientInstance: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/supabase`;
  }
  return LOCAL_SUPABASE_DEFAULT_URL;
}

export function getSupabaseAnonKey(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    LOCAL_SUPABASE_ANON_KEY
  );
}

export function isLocalSupabase(): boolean {
  const url = getSupabaseUrl();
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("/api/supabase");
}

export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  clientInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return clientInstance;
}

/**
 * Uploads a workspace snapshot to Supabase Storage bucket.
 * Stored under: `workspaces/<userId>/<snapshotId>.json`
 */
export async function uploadSnapshotToSupabaseStorage(
  snapshot: WorkspaceSnapshot,
  userId = "local_dev"
): Promise<{ success: boolean; path: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const filePath = `${userId}/${snapshot.id}.json`;
    const fileContent = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET_WORKSPACES)
      .upload(filePath, blob, {
        upsert: true,
        contentType: "application/json"
      });

    if (error) {
      // Fallback: If using local mock endpoint directly
      return await directLocalUploadFallback(filePath, snapshot);
    }

    return { success: true, path: filePath };
  } catch (err: any) {
    // Graceful direct local endpoint fallback
    return await directLocalUploadFallback(`${userId}/${snapshot.id}.json`, snapshot);
  }
}

async function directLocalUploadFallback(
  filePath: string,
  snapshot: WorkspaceSnapshot
): Promise<{ success: boolean; path: string; error?: string }> {
  try {
    const endpoint = `/api/supabase/storage/v1/object/${SUPABASE_BUCKET_WORKSPACES}/${filePath}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot)
    });
    if (res.ok) {
      return { success: true, path: filePath };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, path: filePath, error: data.error || `HTTP ${res.status}` };
  } catch (e: any) {
    return { success: false, path: filePath, error: e.message };
  }
}

/**
 * Downloads a workspace snapshot from Supabase Storage.
 */
export async function downloadSnapshotFromSupabaseStorage(
  filePath: string
): Promise<WorkspaceSnapshot | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_WORKSPACES)
      .download(filePath);

    if (error || !data) {
      // Direct local fetch fallback
      const res = await fetch(
        `/api/supabase/storage/v1/object/public/${SUPABASE_BUCKET_WORKSPACES}/${filePath}`
      );
      if (res.ok) {
        return await res.json();
      }
      return null;
    }

    const text = await data.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Lists all stored snapshots in the Supabase Storage bucket for a given user.
 */
export async function listUserSnapshotsInSupabaseStorage(
  userId = "local_dev"
): Promise<Array<{ name: string; id: string; updatedAt: string; size: number }>> {
  try {
    const res = await fetch(
      `/api/supabase/storage/v1/object/list/${SUPABASE_BUCKET_WORKSPACES}?prefix=${encodeURIComponent(userId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
