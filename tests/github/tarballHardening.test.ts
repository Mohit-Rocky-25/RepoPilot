import { describe, it, expect } from "vitest";
import zlib from "zlib";
import { extractTarballSafely } from "../../packages/github/src/tarballExtractor";

function createCraftedTarArchive(
  entries: Array<{
    name: string;
    content?: string;
    typeFlag?: string;
    linkName?: string;
  }>
): Buffer {
  const blocks: Buffer[] = [];

  for (const entry of entries) {
    // If name > 100 chars, write a GNU LongName ('L') header block first
    if (entry.name.length > 100) {
      const lHeader = Buffer.alloc(512);
      lHeader.write("././@LongLink", 0, 100, "utf-8");
      lHeader.write("0000644\0", 100, 8, "ascii");
      const lSize = entry.name.length.toString(8).padStart(11, "0") + " ";
      lHeader.write(lSize, 124, 12, "ascii");
      lHeader.write("L", 156, 1, "ascii");
      lHeader.write("ustar\0", 257, 6, "ascii");
      lHeader.write("00", 263, 2, "ascii");
      lHeader.fill(32, 148, 156);
      let lCheck = 0;
      for (let i = 0; i < 512; i++) lCheck += lHeader[i];
      lHeader.write(lCheck.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
      blocks.push(lHeader);

      const lNameBuf = Buffer.from(entry.name, "utf-8");
      const lPaddedSize = Math.ceil(lNameBuf.length / 512) * 512;
      const lContentBlock = Buffer.alloc(lPaddedSize);
      lNameBuf.copy(lContentBlock, 0);
      blocks.push(lContentBlock);
    }

    const header = Buffer.alloc(512);
    const content = Buffer.from(entry.content || "", "utf-8");
    const typeFlag = entry.typeFlag !== undefined ? entry.typeFlag : (entry.content !== undefined ? "0" : "5");

    header.write(entry.name, 0, 100, "utf-8");
    header.write("0000644\0", 100, 8, "ascii");
    header.write("0000765\0", 108, 8, "ascii");
    header.write("0000765\0", 116, 8, "ascii");

    const sizeOctal = content.length.toString(8).padStart(11, "0") + " ";
    header.write(sizeOctal, 124, 12, "ascii");
    header.write("14451234567 ", 136, 12, "ascii");
    header.write(typeFlag, 156, 1, "ascii");

    if (entry.linkName) {
      header.write(entry.linkName, 157, 100, "utf-8");
    }

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

describe("Task 2: Tar Hardening", () => {
  describe("Prohibited Entry Type Rejections", () => {
    it("rejects symlink entries (typeflag '2')", () => {
      const archive = createCraftedTarArchive([
        {
          name: "repo-sha/my-symlink",
          typeFlag: "2",
          linkName: "target.txt"
        }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/symlink detected/i);
    });

    it("rejects hardlink entries (typeflag '1')", () => {
      const archive = createCraftedTarArchive([
        {
          name: "repo-sha/my-hardlink",
          typeFlag: "1",
          linkName: "target.txt"
        }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Hard link detected/i);
    });

    it("rejects character device entries (typeflag '3')", () => {
      const archive = createCraftedTarArchive([
        {
          name: "repo-sha/dev-char",
          typeFlag: "3"
        }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Device entry detected/i);
    });

    it("rejects block device entries (typeflag '4')", () => {
      const archive = createCraftedTarArchive([
        {
          name: "repo-sha/dev-block",
          typeFlag: "4"
        }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Device entry detected/i);
    });

    it("rejects FIFO / named pipe entries (typeflag '6')", () => {
      const archive = createCraftedTarArchive([
        {
          name: "repo-sha/my-fifo",
          typeFlag: "6"
        }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/FIFO.*pipe entry detected/i);
    });
  });

  describe("Path Sanitization & Injection Defense", () => {
    it("rejects absolute paths starting with /", () => {
      const archive = createCraftedTarArchive([
        { name: "/etc/shadow", content: "root:!" }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Absolute path detected/i);
    });

    it("rejects paths with backslashes", () => {
      const archive = createCraftedTarArchive([
        { name: "repo-sha\\windows\\cmd.exe", content: "evil" }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Backslash in archive path detected/i);
    });

    it("rejects Windows drive letters", () => {
      const archive = createCraftedTarArchive([
        { name: "C:/Windows/System32/drivers.sys", content: "evil" }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Drive letter|Absolute path/i);
    });

    it("rejects null bytes in entry path", () => {
      const archive = createCraftedTarArchive([
        { name: "repo-sha/safe.txt\0.evil.sh", content: "evil" }
      ]);
      // Should reject either via null byte check or strict path validation
      expect(() => extractTarballSafely(archive)).toThrow(/Null byte|Path traversal|Security Violation/i);
    });

    it("rejects path traversal sequences (..)", () => {
      const archive = createCraftedTarArchive([
        { name: "repo-sha/../../evil.sh", content: "evil" }
      ]);
      expect(() => extractTarballSafely(archive)).toThrow(/Path traversal/i);
    });
  });

  describe("Streaming Limits & Zip-Bomb Protection", () => {
    it("aborts when file count exceeds maxFileCount cap", () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        name: `repo-sha/file-${i}.txt`,
        content: `content ${i}`
      }));
      const archive = createCraftedTarArchive(entries);

      expect(() =>
        extractTarballSafely(archive, { maxFileCount: 10 })
      ).toThrow(/maximum file count limit/i);
    });

    it("aborts when single file size exceeds maxSingleFileSize", () => {
      const archive = createCraftedTarArchive([
        { name: "repo-sha/large.bin", content: "X".repeat(2000) }
      ]);

      expect(() =>
        extractTarballSafely(archive, { maxSingleFileSize: 1000 })
      ).toThrow(/exceeds maximum single file size/i);
    });

    it("aborts when path length exceeds maxPathLength", () => {
      const longPath = "a/".repeat(300) + "file.txt"; // > 600 chars
      const archive = createCraftedTarArchive([
        { name: `repo-sha/${longPath}`, content: "deep" }
      ]);

      expect(() =>
        extractTarballSafely(archive, { maxPathLength: 200 })
      ).toThrow(/Path length.*exceeds maximum allowed length/i);
    });

    it("aborts when decompressed content exceeds total size cap (zip-bomb defense)", () => {
      const archive = createCraftedTarArchive([
        { name: "repo-sha/file1.txt", content: "A".repeat(3000) },
        { name: "repo-sha/file2.txt", content: "B".repeat(3000) }
      ]);

      expect(() =>
        extractTarballSafely(archive, { maxTotalExtractedBytes: 4000 })
      ).toThrow(/exceeds maximum total size/i);
    });
  });
});
