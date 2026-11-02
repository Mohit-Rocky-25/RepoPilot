/**
 * Local-First Workspace & Investigation Snapshot Engine
 *
 * Implements a persistent client-side database using native browser IndexedDB
 * with automatic graceful fallback to localStorage and in-memory cache for SSR/test runners.
 *
 * Stores immutable investigation snapshots including:
 * - Repository coordinates and pinned commit SHA
 * - Assistant conversations and verified source citations
 * - Stack trace parsing, hypotheses, and candidate diffs
 * - Pinned files, symbols, and developer scratchpad notes
 */

export interface AssistantMessageSnapshot {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    file: string;
    startLine: number;
    endLine: number;
    snippet?: string;
  }>;
  timestamp: string;
}

export interface DebuggingStateSnapshot {
  stackTrace: string;
  parsedFrames: Array<{
    file: string;
    line: number;
    method?: string;
    isVendor?: boolean;
  }>;
  selectedHypothesisId?: string;
  candidateDiff?: string;
}

export interface WorkspaceSnapshot {
  id: string;
  title: string;
  repoFullName: string;
  owner: string;
  repo: string;
  commitSha: string;
  defaultBranch: string;
  isLocal?: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notes?: string;
  pinnedFiles: string[];
  activeFile?: string;
  activeLine?: number;
  assistantMessages: AssistantMessageSnapshot[];
  debuggingState?: DebuggingStateSnapshot;
  architectureState?: {
    selectedNodeId?: string;
    activeMode?: "2D" | "3D";
  };
}

const DB_NAME = "repopilot_workspaces_db";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";
const LOCAL_STORAGE_BACKUP_KEY = "REPOPILOT_WORKSPACES_BACKUP";

// Memory cache for SSR, test runners, or sandboxed environments
let inMemoryFallbackStore: WorkspaceSnapshot[] = [];

export function clearInMemoryStoreForTesting(): void {
  inMemoryFallbackStore = [];
}

function isIndexedDbAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.indexedDB.open === "function"
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("repoFullName", "repoFullName", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

// Fallback storage handlers (localStorage + in-memory store)
function getFromFallbackStorage(): WorkspaceSnapshot[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (raw) return JSON.parse(raw);
    } else if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
      const raw = (globalThis as any).localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}

  return [...inMemoryFallbackStore];
}

function saveToFallbackStorage(snapshots: WorkspaceSnapshot[]): void {
  inMemoryFallbackStore = [...snapshots];
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(snapshots));
    } else if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(snapshots));
    }
  } catch (err) {
    console.warn("Could not write snapshots to fallback storage:", err);
  }
}

/**
 * Retrieve all stored workspace snapshots sorted by newest updatedAt.
 */
export async function getAllSnapshots(): Promise<WorkspaceSnapshot[]> {
  if (!isIndexedDbAvailable()) {
    return getFromFallbackStorage().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = (request.result as WorkspaceSnapshot[]) || [];
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(items);
      };
      request.onerror = () => {
        // Fallback on read error
        resolve(getFromFallbackStorage());
      };
    });
  } catch {
    return getFromFallbackStorage().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

/**
 * Get a specific workspace snapshot by ID.
 */
export async function getSnapshotById(id: string): Promise<WorkspaceSnapshot | null> {
  if (!isIndexedDbAvailable()) {
    const all = getFromFallbackStorage();
    return all.find((item) => item.id === id) || null;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as WorkspaceSnapshot) || null);
      request.onerror = () => {
        const all = getFromFallbackStorage();
        resolve(all.find((item) => item.id === id) || null);
      };
    });
  } catch {
    const all = getFromFallbackStorage();
    return all.find((item) => item.id === id) || null;
  }
}

/**
 * Save or update a workspace snapshot.
 */
export async function saveSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
  const updatedSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString()
  };

  // Sync with fallback storage
  const currentBackups = getFromFallbackStorage();
  const existingIndex = currentBackups.findIndex((s) => s.id === updatedSnapshot.id);
  if (existingIndex >= 0) {
    currentBackups[existingIndex] = updatedSnapshot;
  } else {
    currentBackups.unshift(updatedSnapshot);
  }
  saveToFallbackStorage(currentBackups);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(updatedSnapshot);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Graceful fallback
    });
  } catch (err) {
    console.warn("IndexedDB save failed, saved to fallback storage:", err);
  }
}

/**
 * Delete a workspace snapshot by ID.
 */
export async function deleteSnapshot(id: string): Promise<void> {
  const currentBackups = getFromFallbackStorage().filter((s) => s.id !== id);
  saveToFallbackStorage(currentBackups);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("IndexedDB delete failed:", err);
  }
}

/**
 * Generate a clean, reproducible Markdown audit report from a snapshot.
 */
export function exportSnapshotAsMarkdown(snapshot: WorkspaceSnapshot): string {
  const dateStr = new Date(snapshot.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  let md = `# RepoPilot Investigation Snapshot: ${snapshot.title}\n\n`;
  md += `**Repository:** [${snapshot.repoFullName}](https://github.com/${snapshot.repoFullName})  \n`;
  md += `**Pinned Revision:** \`${snapshot.commitSha.slice(0, 7)}\` (\`${snapshot.commitSha}\`)  \n`;
  md += `**Branch:** \`${snapshot.defaultBranch}\`  \n`;
  md += `**Snapshot Created:** ${dateStr}  \n`;
  if (snapshot.tags && snapshot.tags.length > 0) {
    md += `**Tags:** ${snapshot.tags.map((t) => `\`${t}\``).join(", ")}  \n`;
  }
  md += `\n---\n\n`;

  if (snapshot.notes) {
    md += `## Developer Notes & Hypothesis\n\n${snapshot.notes}\n\n---\n\n`;
  }

  if (snapshot.pinnedFiles && snapshot.pinnedFiles.length > 0) {
    md += `## Pinned Reference Files (${snapshot.pinnedFiles.length})\n\n`;
    snapshot.pinnedFiles.forEach((file) => {
      md += `- \`${file}\`\n`;
    });
    md += `\n---\n\n`;
  }

  if (snapshot.assistantMessages && snapshot.assistantMessages.length > 0) {
    md += `## Grounded Q&A Session (${snapshot.assistantMessages.length} exchanges)\n\n`;
    snapshot.assistantMessages.forEach((msg, idx) => {
      const sender = msg.role === "user" ? "Developer" : "RepoPilot Assistant";
      md += `### ${idx + 1}. ${sender}\n\n${msg.content}\n\n`;
      if (msg.citations && msg.citations.length > 0) {
        md += `**Verified Citations:**\n`;
        msg.citations.forEach((c) => {
          md += `- \`${c.file}:${c.startLine}-${c.endLine}\`\n`;
        });
        md += `\n`;
      }
    });
    md += `---\n\n`;
  }

  if (snapshot.debuggingState) {
    md += `## Bug Investigation & Stack Trace\n\n`;
    if (snapshot.debuggingState.stackTrace) {
      md += `### Stack Trace\n\`\`\`\n${snapshot.debuggingState.stackTrace}\n\`\`\`\n\n`;
    }
    if (snapshot.debuggingState.candidateDiff) {
      md += `### Candidate Fix Diff\n\`\`\`diff\n${snapshot.debuggingState.candidateDiff}\n\`\`\`\n\n`;
    }
  }

  md += `*Generated automatically by [RepoPilot](https://repopilot.dev) — Evidence-First Codebase Intelligence.*`;
  return md;
}

export interface CloudSyncResult {
  success: boolean;
  syncedCount: number;
  pulledCount: number;
  pushedCount: number;
  lastSyncTime: string;
  error?: string;
}

/**
 * Bi-directional Cloud Sync Engine
 *
 * Merges local IndexedDB snapshots with authenticated cloud storage.
 * Resolves conflicts automatically using last-write-wins (ISO updatedAt comparison).
 */
export async function syncWithCloud(): Promise<CloudSyncResult> {
  const nowIso = new Date().toISOString();
  try {
    const res = await fetch("/api/workspaces", {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (res.status === 401) {
      return {
        success: false,
        syncedCount: 0,
        pulledCount: 0,
        pushedCount: 0,
        lastSyncTime: nowIso,
        error: "Not authenticated with Google / Cloud Account"
      };
    }

    if (!res.ok) {
      throw new Error(`Cloud sync error HTTP ${res.status}`);
    }

    const data = await res.json();
    const cloudSnapshots: WorkspaceSnapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];
    const localSnapshots = await getAllSnapshots();

    const localMap = new Map<string, WorkspaceSnapshot>();
    localSnapshots.forEach((s) => localMap.set(s.id, s));

    const cloudMap = new Map<string, WorkspaceSnapshot>();
    cloudSnapshots.forEach((s) => cloudMap.set(s.id, s));

    let pulledCount = 0;
    const toPushToCloud: WorkspaceSnapshot[] = [];

    // 1. Pull missing or newer cloud items into local IndexedDB
    for (const cloudSnap of cloudSnapshots) {
      const local = localMap.get(cloudSnap.id);
      if (!local || new Date(cloudSnap.updatedAt) > new Date(local.updatedAt)) {
        await saveSnapshot(cloudSnap);
        pulledCount++;
      }
    }

    // 2. Identify local snapshots that need to be pushed up to cloud
    for (const localSnap of localSnapshots) {
      const cloud = cloudMap.get(localSnap.id);
      if (!cloud || new Date(localSnap.updatedAt) > new Date(cloud.updatedAt)) {
        toPushToCloud.push(localSnap);
      }
    }

    let pushedCount = 0;
    if (toPushToCloud.length > 0) {
      const pushRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshots: toPushToCloud })
      });

      if (pushRes.ok) {
        pushedCount = toPushToCloud.length;
      }
    }

    const finalSnapshots = await getAllSnapshots();

    return {
      success: true,
      syncedCount: finalSnapshots.length,
      pulledCount,
      pushedCount,
      lastSyncTime: nowIso
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      pulledCount: 0,
      pushedCount: 0,
      lastSyncTime: nowIso,
      error: err.message || "Failed to complete cloud synchronization"
    };
  }
}
