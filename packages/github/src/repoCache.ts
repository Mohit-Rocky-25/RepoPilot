import type { ExtractedRepository } from "./tarballExtractor";

export interface IRepositoryCache {
  get(key: string): ExtractedRepository | null;
  set(key: string, data: ExtractedRepository): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

export class InMemoryLruRepositoryCache implements IRepositoryCache {
  private cache = new Map<string, ExtractedRepository>();
  private maxItems: number;

  constructor(maxItems: number = 8) {
    this.maxItems = maxItems;
  }

  get(key: string): ExtractedRepository | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Refresh LRU order: delete and re-insert at end
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key: string, data: ExtractedRepository): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxItems) {
      // Evict oldest item (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, data);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global immutable repository cache keyed by "owner/repo@sha"
export const globalRepoCache = new InMemoryLruRepositoryCache(8);
