import { describe, it, expect } from "vitest";
import zlib from "zlib";
import { extractTarballSafely } from "../../packages/github/src/tarballExtractor";

function createSizedTarArchive(
  entries: Array<{
    name: string;
    content?: string;
  }>
): Buffer {
  const blocks: Buffer[] = [];

  for (const entry of entries) {
    const header = Buffer.alloc(512);
    const content = Buffer.from(entry.content || "", "utf-8");

    header.write(entry.name, 0, 100, "utf-8");
    header.write("0000644\0", 100, 8, "ascii");
    header.write("0000765\0", 108, 8, "ascii");
    header.write("0000765\0", 116, 8, "ascii");

    const sizeOctal = content.length.toString(8).padStart(11, "0") + " ";
    header.write(sizeOctal, 124, 12, "ascii");
    header.write("14451234567 ", 136, 12, "ascii");
    header.write("0", 156, 1, "ascii"); // regular file

    header.write("ustar\0", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");

    header.fill(32, 148, 156);
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumOctal = checksum.toString(8).padStart(6, "0") + "\0 ";
    header.write(checksumOctal, 148, 8, "ascii");

    blocks.push(header);

    if (content.length > 0) {
      const paddedSize = Math.ceil(content.length / 512) * 512;
      const contentBlock = Buffer.alloc(paddedSize);
      content.copy(contentBlock, 0);
      blocks.push(contentBlock);
    }
  }

  blocks.push(Buffer.alloc(512));
  blocks.push(Buffer.alloc(512));

  return zlib.gzipSync(Buffer.concat(blocks));
}

describe("Task 6: Serverless Limits & Large Input Behavior", () => {
  describe("Worst-Case Runtime Simulation (25 MB / 1500 Files)", () => {
    it("processes a near-cap archive of 1,500 files within serverless execution budget without timeout", () => {
      const entries = Array.from({ length: 1500 }, (_, i) => ({
        name: `repo-sha/src/module_${i}/index.ts`,
        content: `export const val_${i} = ${i};`
      }));

      const startTime = performance.now();
      const archive = createSizedTarArchive(entries);
      const extractionTime = performance.now();
      const result = extractTarballSafely(archive, { maxFileCount: 1500 });
      const elapsed = performance.now() - extractionTime;

      expect(result.files.length).toBe(1500);
      // Processing 1500 files in memory should take well under 2,000ms (safe for serverless maxDuration)
      expect(elapsed).toBeLessThan(2000);
    });

    it("fails with a clear error before timeout when archive size exceeds 25 MB cap", () => {
      // 26 MB dummy buffer exceeding 25 MB cap
      const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024);

      expect(() =>
        extractTarballSafely(oversizedBuffer, {
          maxArchiveSizeBytes: 25 * 1024 * 1024
        })
      ).toThrow(/Repository archive exceeds maximum allowed size of 25 MB/i);
    });

    it("fails with a clear security error when file count exceeds 1,500 files limit", () => {
      const entries = Array.from({ length: 1501 }, (_, i) => ({
        name: `repo-sha/file_${i}.txt`,
        content: `line ${i}`
      }));
      const archive = createSizedTarArchive(entries);

      expect(() =>
        extractTarballSafely(archive, { maxFileCount: 1500 })
      ).toThrow(/Repository exceeds maximum file count limit of 1500/i);
    });
  });

  describe("Skipped-Files Report", () => {
    it("accurately categorizes and reports skipped files by reason (ignored directory, binary, too large)", () => {
      const entries = [
        // Normal file
        { name: "repo-sha/src/index.ts", content: 'console.log("hello");' },
        // Ignored directories
        { name: "repo-sha/node_modules/dep/index.js", content: "module.exports = {};" },
        { name: "repo-sha/.git/HEAD", content: "ref: refs/heads/main" },
        // Binary files
        { name: "repo-sha/assets/logo.png", content: "\x89PNG\r\n\x1a\n" },
        { name: "repo-sha/lib/parser.wasm", content: "\0asm\x01\0\0\0" },
        // Too large (exceeds maxFileSize 50 bytes)
        { name: "repo-sha/data/large.json", content: "A".repeat(100) }
      ];

      const archive = createSizedTarArchive(entries);
      const result = extractTarballSafely(archive, {
        maxFileSize: 50 // 50 bytes threshold for content caching
      });

      expect(result.skippedReport).toBeDefined();
      expect(result.skippedReport?.ignoredDirectory).toBe(2);
      expect(result.skippedReport?.binary).toBe(2);
      expect(result.skippedReport?.tooLarge).toBe(1);
      expect(result.skippedReport?.totalSkipped).toBe(5);
    });

    it("allows picking a sub-folder to ingest and filters only matching files", () => {
      const entries = [
        { name: "repo-sha/packages/core/src/index.ts", content: "export const core = 1;" },
        { name: "repo-sha/packages/search/src/index.ts", content: "export const search = 2;" },
        { name: "repo-sha/packages/ai/src/index.ts", content: "export const ai = 3;" },
        { name: "repo-sha/README.md", content: "# Root Readme" }
      ];

      const archive = createSizedTarArchive(entries);
      const result = extractTarballSafely(archive, {
        subfolder: "packages/core"
      });

      expect(result.files.length).toBe(1);
      expect(result.files[0].path).toBe("packages/core/src/index.ts");
      expect(result.contents.has("packages/core/src/index.ts")).toBe(true);
      expect(result.contents.has("packages/search/src/index.ts")).toBe(false);
    });
  });
});
