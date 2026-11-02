import { describe, it, expect, beforeEach } from "vitest";
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  isLocalSupabase,
  LOCAL_SUPABASE_DEFAULT_URL,
  LOCAL_SUPABASE_ANON_KEY,
  SUPABASE_BUCKET_WORKSPACES,
  uploadSnapshotToSupabaseStorage
} from "@/lib/supabase";
import type { WorkspaceSnapshot } from "@/lib/workspaceStore";

describe("Local Supabase Storage Module", () => {
  it("should default to local Supabase URL when no remote env is set", () => {
    const url = getSupabaseUrl();
    expect(url).toContain(LOCAL_SUPABASE_DEFAULT_URL);
  });

  it("should provide the standard local development anon key", () => {
    const key = getSupabaseAnonKey();
    expect(key).toBe(LOCAL_SUPABASE_ANON_KEY);
  });

  it("should detect local development environment correctly", () => {
    expect(isLocalSupabase()).toBe(true);
  });

  it("should designate the standard workspaces bucket", () => {
    expect(SUPABASE_BUCKET_WORKSPACES).toBe("workspaces");
  });

  it("should format snapshot upload path with userId namespacing", async () => {
    const testSnapshot: WorkspaceSnapshot = {
      id: "ws_supabase_unit_test",
      title: "Supabase Unit Test Investigation",
      repoFullName: "facebook/react",
      owner: "facebook",
      repo: "react",
      commitSha: "f0e1d2c3b4a5",
      defaultBranch: "main",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ["supabase", "test"],
      notes: "Testing local Supabase storage bucket serialization",
      pinnedFiles: ["packages/react/src/React.js"],
      assistantMessages: []
    };

    // Call upload with custom user ID
    const res = await uploadSnapshotToSupabaseStorage(testSnapshot, "test_engineer");
    expect(res.path).toBe("test_engineer/ws_supabase_unit_test.json");
  });
});
