import type { RepositoryFile, RepositoryReference } from "@repopilot/core";

export interface CachedRepositoryData {
  repository: RepositoryReference;
  revision: {
    commitSha: string;
    treeSha: string;
    ref?: string;
  };
  tree: RepositoryFile[];
  skippedReport?: {
    totalSkipped: number;
    tooLarge: number;
    binary: number;
    ignoredDirectory: number;
    overFileCap: number;
  };
  cachedAt: number;
  expiresAt: number;
}

interface CacheEntry {
  data: CachedRepositoryData;
  expiresAt: number;
}

export class ServerIndexCache {
  private static instance: ServerIndexCache;
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number;

  private constructor(defaultTtlSeconds = 3600) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  public static getInstance(defaultTtlSeconds = 3600): ServerIndexCache {
    if (!ServerIndexCache.instance) {
      ServerIndexCache.instance = new ServerIndexCache(defaultTtlSeconds);
    }
    return ServerIndexCache.instance;
  }

  public buildKey(owner: string, repo: string, sha: string, subfolder?: string): string {
    const cleanOwner = (owner || "").toLowerCase().trim();
    const cleanRepo = (repo || "").toLowerCase().trim();
    const cleanSha = (sha || "").toLowerCase().trim();
    const cleanSub = subfolder ? `:${subfolder.toLowerCase().trim().replace(/^\/+|\/+$/g, "")}` : "";
    return `${cleanOwner}/${cleanRepo}@${cleanSha}${cleanSub}`;
  }

  public get(owner: string, repo: string, sha: string, subfolder?: string): CachedRepositoryData | null {
    if (!owner || !repo || !sha) return null;
    const key = this.buildKey(owner, repo, sha, subfolder);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(
    owner: string,
    repo: string,
    sha: string,
    data: Omit<CachedRepositoryData, "cachedAt" | "expiresAt">,
    subfolder?: string,
    ttlSeconds?: number
  ): void {
    if (!owner || !repo || !sha) return;
    const key = this.buildKey(owner, repo, sha, subfolder);
    const now = Date.now();
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    const expiresAt = now + ttlMs;

    const cachedData: CachedRepositoryData = {
      ...data,
      cachedAt: now,
      expiresAt
    };

    this.cache.set(key, { data: cachedData, expiresAt });
  }

  public has(owner: string, repo: string, sha: string, subfolder?: string): boolean {
    return this.get(owner, repo, sha, subfolder) !== null;
  }

  public delete(owner: string, repo: string, sha: string, subfolder?: string): boolean {
    const key = this.buildKey(owner, repo, sha, subfolder);
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        purged++;
      }
    }
    return purged;
  }

  public size(): number {
    this.purgeExpired();
    return this.cache.size;
  }
}

export const serverIndexCache = ServerIndexCache.getInstance(
  process.env.INDEX_CACHE_TTL_SECONDS ? parseInt(process.env.INDEX_CACHE_TTL_SECONDS, 10) : 3600
);
