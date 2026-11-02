import { describe, it, expect, beforeEach } from "vitest";
import {
  WorkspaceSnapshot,
  getAllSnapshots,
  getSnapshotById,
  saveSnapshot,
  deleteSnapshot,
  exportSnapshotAsMarkdown,
  clearInMemoryStoreForTesting
} from "@/lib/workspaceStore";

describe("Workspace Snapshot Store (IndexedDB & Fallback Engine)", () => {
  const mockSnapshot: WorkspaceSnapshot = {
    id: "ws_test_123",
    title: "Auth Token Expiry Investigation",
    repoFullName: "developit/mitt",
    owner: "developit",
    repo: "mitt",
    commitSha: "5c804b7a1234567890abcdef",
    defaultBranch: "main",
    isLocal: false,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    tags: ["auth", "bug-fix"],
    notes: "Suspected race condition during token refresh handler.",
    pinnedFiles: ["src/index.ts", "package.json"],
    activeFile: "src/index.ts",
    activeLine: 42,
    assistantMessages: [
      {
        id: "msg_1",
        role: "user",
        content: "Where are event handlers registered?",
        timestamp: "2026-11-01T12:01:00.000Z"
      },
      {
        id: "msg_2",
        role: "assistant",
        content: "Handlers are registered via the `on` method in `src/index.ts`.",
        citations: [
          {
            file: "src/index.ts",
            startLine: 6,
            endLine: 8,
            snippet: "on(type, handler) { all.set(type, handler); }"
          }
        ],
        timestamp: "2026-11-01T12:01:05.000Z"
      }
    ],
    debuggingState: {
      stackTrace: "Error: Unhandled handler\n    at mitt.emit (src/index.ts:12:5)",
      parsedFrames: [
        {
          file: "src/index.ts",
          line: 12,
          method: "emit",
          isVendor: false
        }
      ],
      selectedHypothesisId: "hypo_1",
      candidateDiff: "--- a/src/index.ts\n+++ b/src/index.ts\n@@ -12,2 +12,3 @@\n+ if (!handler) return;"
    }
  };

  beforeEach(() => {
    clearInMemoryStoreForTesting();
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("persists a snapshot and retrieves it in getAllSnapshots", async () => {
    await saveSnapshot(mockSnapshot);
    const snapshots = await getAllSnapshots();
    expect(snapshots.length).toBeGreaterThanOrEqual(1);

    const found = snapshots.find((s) => s.id === mockSnapshot.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Auth Token Expiry Investigation");
    expect(found?.repoFullName).toBe("developit/mitt");
    expect(found?.commitSha).toBe(mockSnapshot.commitSha);
    expect(found?.tags).toEqual(["auth", "bug-fix"]);
  });

  it("retrieves a snapshot by its exact ID", async () => {
    await saveSnapshot(mockSnapshot);
    const retrieved = await getSnapshotById("ws_test_123");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("ws_test_123");
    expect(retrieved?.activeFile).toBe("src/index.ts");
    expect(retrieved?.activeLine).toBe(42);
    expect(retrieved?.assistantMessages.length).toBe(2);
  });

  it("returns null for non-existent snapshot ID", async () => {
    const nonExistent = await getSnapshotById("ws_non_existent_999");
    expect(nonExistent).toBeNull();
  });

  it("deletes a snapshot by ID", async () => {
    await saveSnapshot(mockSnapshot);
    let all = await getAllSnapshots();
    expect(all.some((s) => s.id === "ws_test_123")).toBe(true);

    await deleteSnapshot("ws_test_123");
    all = await getAllSnapshots();
    expect(all.some((s) => s.id === "ws_test_123")).toBe(false);
  });

  it("exports a snapshot into clean, verifiable Markdown report", () => {
    const markdown = exportSnapshotAsMarkdown(mockSnapshot);

    expect(markdown).toContain("# RepoPilot Investigation Snapshot: Auth Token Expiry Investigation");
    expect(markdown).toContain("developit/mitt");
    expect(markdown).toContain("5c804b7");
    expect(markdown).toContain("Suspected race condition during token refresh handler.");
    expect(markdown).toContain("`src/index.ts`");
    expect(markdown).toContain("Handlers are registered via the `on` method");
    expect(markdown).toContain("`src/index.ts:6-8`");
    expect(markdown).toContain("### Candidate Fix Diff");
    expect(markdown).toContain("+ if (!handler) return;");
    expect(markdown).toContain("Evidence-First Codebase Intelligence");
  });
});
