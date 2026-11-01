import type { RepositoryFile, RepositoryReference } from "@repopilot/core";

export interface BrowserCachedIndex {
  key: string;
  owner: string;
  repo: string;
  commitSha: string;
  repository: RepositoryReference;
  tree: RepositoryFile[];
  skippedReport?: any;
  timestamp: number;
}

const DB_NAME = "repopilot_cache";
const STORE_NAME = "parsed_indices";
const DB_VERSION = 1;

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn("Failed to open IndexedDB:", request.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export function buildCacheKey(owner: string, repo: string, commitSha: string): string {
  return `${(owner || "").toLowerCase().trim()}/${(repo || "").toLowerCase().trim()}@${(commitSha || "").toLowerCase().trim()}`;
}

export async function saveIndexToIndexedDB(
  owner: string,
  repo: string,
  commitSha: string,
  data: {
    repository: RepositoryReference;
    tree: RepositoryFile[];
    skippedReport?: any;
  }
): Promise<boolean> {
  if (!isIndexedDBAvailable() || !owner || !repo || !commitSha) return false;

  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const key = buildCacheKey(owner, repo, commitSha);

      const entry: BrowserCachedIndex = {
        key,
        owner: owner.toLowerCase().trim(),
        repo: repo.toLowerCase().trim(),
        commitSha: commitSha.toLowerCase().trim(),
        repository: data.repository,
        tree: data.tree,
        skippedReport: data.skippedReport,
        timestamp: Date.now()
      };

      const req = store.put(entry);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getIndexFromIndexedDB(
  owner: string,
  repo: string,
  commitSha: string
): Promise<BrowserCachedIndex | null> {
  if (!isIndexedDBAvailable() || !owner || !repo || !commitSha) return null;

  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const key = buildCacheKey(owner, repo, commitSha);

      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function deleteIndexFromIndexedDB(
  owner: string,
  repo: string,
  commitSha: string
): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false;

  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const key = buildCacheKey(owner, repo, commitSha);

      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
