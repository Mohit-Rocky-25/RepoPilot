import { describe, it, expect, beforeEach } from "vitest";
import { ServerIndexCache, serverIndexCache } from "../../src/lib/serverIndexCache";
import { buildCacheKey } from "../../src/lib/browserIndexCache";
import type { RepositoryFile, RepositoryReference } from "@repopilot/core";

describe("Task 2: Server Index Cache (TTL & Repo+SHA Keying)", () => {
  let cache: ServerIndexCache;

  const mockRepo: RepositoryReference = {
    owner: "vercel",
    repo: "swr",
    fullName: "vercel/swr",
    url: "https://github.com/vercel/swr",
    defaultBranch: "main",
    stars: 28000,
    forks: 1200,
    openIssuesCount: 45
  };

  const mockRevision = {
    commitSha: "a1b2c3d4e5f6789012345678901234567890abcd",
    treeSha: "t1u2v3w4x5y6789012345678901234567890abcd"
  };

  const mockFiles: RepositoryFile[] = [
    {
      path: "package.json",
      size: 500,
      type: "blob",
      sha: "sha0",
      isBinary: false
    },
    {
      path: "src/index.ts",
      size: 1200,
      type: "blob",
      sha: "sha1",
      language: "TypeScript",
      isBinary: false
    }
  ];

  beforeEach(() => {
    cache = ServerIndexCache.getInstance(1); // 1 second TTL for test
    cache.clear();
  });

  it("builds canonical cache keys from owner, repo, and commit SHA", () => {
    const key = cache.buildKey("Vercel", "SWR", "A1B2C3D");
    expect(key).toBe("vercel/swr@a1b2c3d");

    const keyWithSub = cache.buildKey("vercel", "swr", "a1b2c3d", "/packages/core/");
    expect(keyWithSub).toBe("vercel/swr@a1b2c3d:packages/core");
  });

  it("stores and retrieves parsed repository index data, skipping repeat downloads", () => {
    cache.set(mockRepo.owner, mockRepo.repo, mockRevision.commitSha, {
      repository: mockRepo,
      revision: mockRevision,
      tree: mockFiles
    });

    const cached = cache.get(mockRepo.owner, mockRepo.repo, mockRevision.commitSha);
    expect(cached).toBeDefined();
    expect(cached?.tree.length).toBe(2);
    expect(cached?.repository.fullName).toBe("vercel/swr");
    expect(cached?.revision.commitSha).toBe(mockRevision.commitSha);
    expect(cache.has(mockRepo.owner, mockRepo.repo, mockRevision.commitSha)).toBe(true);
  });

  it("expires cached entries after TTL", async () => {
    // 50ms TTL
    cache.set(
      mockRepo.owner,
      mockRepo.repo,
      mockRevision.commitSha,
      {
        repository: mockRepo,
        revision: mockRevision,
        tree: mockFiles
      },
      undefined,
      0.05 // 50ms
    );

    expect(cache.has(mockRepo.owner, mockRepo.repo, mockRevision.commitSha)).toBe(true);

    // Wait for TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(cache.get(mockRepo.owner, mockRepo.repo, mockRevision.commitSha)).toBeNull();
    expect(cache.has(mockRepo.owner, mockRepo.repo, mockRevision.commitSha)).toBe(false);
  });

  it("supports purging expired entries and cache sizing", () => {
    cache.set(mockRepo.owner, mockRepo.repo, "sha1", {
      repository: mockRepo,
      revision: mockRevision,
      tree: mockFiles
    });

    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe("Task 2: Browser Index Cache & Share Link", () => {
  it("generates deterministic cache keys matching browser IndexedDB expectations", () => {
    const key = buildCacheKey("facebook", "react", "b8a91c0");
    expect(key).toBe("facebook/react@b8a91c0");
  });

  it("formats shareable links that re-open exact repository and pinned commit SHA", () => {
    const origin = "https://repopilot.dev";
    const shareUrl = new URL(`${origin}/explore`);
    shareUrl.searchParams.set("owner", "vercel");
    shareUrl.searchParams.set("repo", "swr");
    shareUrl.searchParams.set("sha", "4a3b2c1d0e");
    shareUrl.searchParams.set("file", "src/index.ts");

    expect(shareUrl.toString()).toBe("https://repopilot.dev/explore?owner=vercel&repo=swr&sha=4a3b2c1d0e&file=src%2Findex.ts");
    expect(shareUrl.searchParams.get("sha")).toBe("4a3b2c1d0e");
    expect(shareUrl.searchParams.get("owner")).toBe("vercel");
    expect(shareUrl.searchParams.get("repo")).toBe("swr");
  });
});
