import { describe, it, expect } from "vitest";
import zlib from "zlib";
import {
  extractTarballSafely,
  InMemoryLruRepositoryCache,
  GitHubClient
} from "../../packages/github/src";

/**
 * Creates a minimal valid POSIX UStar tar buffer for testing
 */
function createTarArchive(
  entries: Array<{
    name: string;
    content?: string;
    typeFlag?: string; // '0' for file, '2' for symlink, '5' for dir
    linkName?: string;
  }>
): Buffer {
  const blocks: Buffer[] = [];

  for (const entry of entries) {
    const header = Buffer.alloc(512);
    const content = Buffer.from(entry.content || "", "utf-8");
    const typeFlag = entry.typeFlag || (entry.content !== undefined ? "0" : "5");

    // 0..100: name
    header.write(entry.name, 0, 100, "utf-8");

    // 100..108: mode
    header.write("0000644\0", 100, 8, "ascii");

    // 108..116: uid
    header.write("0000765\0", 108, 8, "ascii");

    // 116..124: gid
    header.write("0000765\0", 116, 8, "ascii");

    // 124..136: size (octal)
    const sizeOctal = content.length.toString(8).padStart(11, "0") + " ";
    header.write(sizeOctal, 124, 12, "ascii");

    // 136..148: mtime
    header.write("14451234567 ", 136, 12, "ascii");

    // 156: typeflag
    header.write(typeFlag, 156, 1, "ascii");

    // 157..257: linkname
    if (entry.linkName) {
      header.write(entry.linkName, 157, 100, "utf-8");
    }

    // 257..263: magic
    header.write("ustar\0", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");

    // 148..156: checksum calculation (fill with 8 spaces first)
    header.fill(32, 148, 156);
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumOctal = checksum.toString(8).padStart(6, "0") + "\0 ";
    header.write(checksumOctal, 148, 8, "ascii");

    blocks.push(header);

    // Write file content padded to 512-byte block
    if (content.length > 0) {
      const paddedSize = Math.ceil(content.length / 512) * 512;
      const contentBlock = Buffer.alloc(paddedSize);
      content.copy(contentBlock, 0);
      blocks.push(contentBlock);
    }
  }

  // End of archive: two 512-byte zero blocks
  blocks.push(Buffer.alloc(512));
  blocks.push(Buffer.alloc(512));

  const tarBuffer = Buffer.concat(blocks);
  return zlib.gzipSync(tarBuffer);
}

describe("GitHub Ingestion & Tarball Safety (extractTarballSafely)", () => {
  it("extracts a normal repository archive safely", () => {
    const archive = createTarArchive([
      { name: "test-repo-sha1234/package.json", content: '{"name": "test-repo"}' },
      { name: "test-repo-sha1234/src/index.ts", content: 'export const hello = "world";' }
    ]);

    const result = extractTarballSafely(archive);
    expect(result.files.length).toBe(2);
    expect(result.contents.get("package.json")).toBe('{"name": "test-repo"}');
    expect(result.contents.get("src/index.ts")).toBe('export const hello = "world";');
    expect(result.files[0].path).toBe("package.json");
    expect(result.files[1].path).toBe("src/index.ts");
    expect(result.files[1].language).toBe("TypeScript");
  });

  it("rejects malicious archive containing path traversal sequences", () => {
    const maliciousArchive = createTarArchive([
      { name: "test-repo-sha1234/../../etc/passwd", content: "root:x:0:0:root" }
    ]);

    expect(() => extractTarballSafely(maliciousArchive)).toThrow(/Path traversal detected/);
  });

  it("rejects malicious archive containing symlinks escaping repository root", () => {
    const maliciousArchive = createTarArchive([
      {
        name: "test-repo-sha1234/evil_symlink",
        typeFlag: "2",
        linkName: "../../secret/keys.env"
      }
    ]);

    expect(() => extractTarballSafely(maliciousArchive)).toThrow(/Malicious symlink detected/);
  });

  it("rejects archives exceeding maxArchiveSizeBytes", () => {
    const archive = createTarArchive([
      { name: "test-repo-sha1234/file.txt", content: "A".repeat(500) }
    ]);

    expect(() =>
      extractTarballSafely(archive, {
        maxArchiveSizeBytes: 100 // Enforce small limit
      })
    ).toThrow(/exceeds maximum allowed size/);
  });

  it("rejects archives exceeding maxTotalExtractedBytes", () => {
    const archive = createTarArchive([
      { name: "test-repo-sha1234/bigfile.txt", content: "B".repeat(2000) }
    ]);

    expect(() =>
      extractTarballSafely(archive, {
        maxTotalExtractedBytes: 1000 // Limit extraction to 1000 bytes
      })
    ).toThrow(/exceeds maximum total size/);
  });

  describe("InMemoryLruRepositoryCache", () => {
    it("stores and retrieves repository archives by key with LRU eviction", () => {
      const cache = new InMemoryLruRepositoryCache(2);
      const mockRepo1 = { files: [], contents: new Map(), totalFilesExtracted: 0, totalBytesExtracted: 0 };
      const mockRepo2 = { files: [], contents: new Map(), totalFilesExtracted: 0, totalBytesExtracted: 0 };
      const mockRepo3 = { files: [], contents: new Map(), totalFilesExtracted: 0, totalBytesExtracted: 0 };

      cache.set("owner/repo1@sha1", mockRepo1);
      cache.set("owner/repo2@sha2", mockRepo2);
      expect(cache.has("owner/repo1@sha1")).toBe(true);
      expect(cache.has("owner/repo2@sha2")).toBe(true);

      // Access repo1 so repo2 becomes oldest
      cache.get("owner/repo1@sha1");

      // Insert 3rd item: should evict repo2
      cache.set("owner/repo3@sha3", mockRepo3);

      expect(cache.has("owner/repo1@sha1")).toBe(true);
      expect(cache.has("owner/repo3@sha3")).toBe(true);
      expect(cache.has("owner/repo2@sha2")).toBe(false);
    });
  });

  describe("GitHubClient API Call Counting", () => {
    it("tracks API call count and resets properly", () => {
      const client = new GitHubClient();
      expect(client.getApiCallCount()).toBe(0);
      client.resetApiCallCount();
      expect(client.getApiCallCount()).toBe(0);
    });
  });
});
