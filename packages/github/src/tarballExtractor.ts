import zlib from "zlib";
import type { RepositoryFile } from "@repopilot/core";

export interface TarballExtractionOptions {
  maxArchiveSizeBytes?: number; // default: 25 MB
  maxTotalExtractedBytes?: number; // default: 50 MB
  maxFileSize?: number; // default: 100 KB (cached text content cap)
  maxSingleFileSize?: number; // default: 10 MB (strict abort cap per file)
  maxFileCount?: number; // default: 1500 (strict abort cap)
  maxPathLength?: number; // default: 512 (strict abort cap)
}

export interface ExtractedRepository {
  files: RepositoryFile[];
  contents: Map<string, string>; // path -> content
  totalFilesExtracted: number;
  totalBytesExtracted: number;
}

const DEFAULT_OPTIONS: Required<TarballExtractionOptions> = {
  maxArchiveSizeBytes: 25 * 1024 * 1024, // 25 MB
  maxTotalExtractedBytes: 50 * 1024 * 1024, // 50 MB
  maxFileSize: 100 * 1024, // 100 KB
  maxSingleFileSize: 10 * 1024 * 1024, // 10 MB
  maxFileCount: 1500,
  maxPathLength: 512
};

const IGNORED_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "vendor/",
  "target/",
  "venv/",
  ".venv/",
  "__pycache__/"
];

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "exe", "dll", "so", "dylib", "bin", "o", "a",
  "zip", "tar", "gz", "7z", "rar",
  "pdf", "doc", "docx", "mp3", "mp4", "wav",
  "woff", "woff2", "ttf", "eot", "otf", "wasm"
]);

function detectLanguage(ext?: string, path?: string): string {
  if (!ext) {
    if (path?.endsWith("Dockerfile")) return "Dockerfile";
    if (path?.endsWith("Makefile")) return "Makefile";
    return "Plain Text";
  }
  switch (ext.toLowerCase()) {
    case "ts":
    case "tsx":
      return "TypeScript";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "JavaScript";
    case "py":
      return "Python";
    case "go":
      return "Go";
    case "rs":
      return "Rust";
    case "java":
      return "Java";
    case "json":
      return "JSON";
    case "md":
    case "mdx":
      return "Markdown";
    case "html":
      return "HTML";
    case "css":
    case "scss":
      return "CSS";
    case "yml":
    case "yaml":
      return "YAML";
    case "toml":
      return "TOML";
    case "sh":
    case "bash":
      return "Shell";
    case "sql":
      return "SQL";
    default:
      return "Plain Text";
  }
}

/**
 * Safely extracts a gzipped tarball stream/buffer into an in-memory repository structure.
 * Defends against tar-bombs, path traversal (../), absolute paths, null bytes, and malicious symlinks.
 */
export function extractTarballSafely(
  archiveBuffer: Buffer,
  options?: TarballExtractionOptions
): ExtractedRepository {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (archiveBuffer.length > opts.maxArchiveSizeBytes) {
    throw new Error(
      `Repository archive exceeds maximum allowed size of ${(opts.maxArchiveSizeBytes / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  // Decompress gzipped tarball
  let tarBuffer: Buffer;
  try {
    tarBuffer = zlib.gunzipSync(archiveBuffer, {
      maxOutputLength: opts.maxTotalExtractedBytes
    });
  } catch (err: any) {
    if (err.code === "ERR_BUFFER_TOO_LARGE" || err.message?.includes("maxOutputLength")) {
      throw new Error(`Extracted repository content exceeds maximum total size of ${(opts.maxTotalExtractedBytes / (1024 * 1024)).toFixed(0)} MB.`);
    }
    throw new Error(`Failed to decompress repository archive: ${err.message}`);
  }

  const files: RepositoryFile[] = [];
  const contents = new Map<string, string>();
  let totalBytes = 0;

  let offset = 0;
  let nextOverrideName: string | null = null;

  while (offset + 512 <= tarBuffer.length) {
    const headerBlock = tarBuffer.subarray(offset, offset + 512);
    offset += 512;

    // Two consecutive zero blocks indicate the end of the archive
    if (headerBlock.every((b) => b === 0)) {
      break;
    }

    // Check for null bytes in raw header name block
    const nameField = headerBlock.subarray(0, 100);
    const firstNull = nameField.indexOf(0);
    if (firstNull !== -1) {
      for (let i = firstNull + 1; i < 100; i++) {
        if (nameField[i] !== 0) {
          throw new Error(`Security Violation: Null byte in archive path detected.`);
        }
      }
    }

    // Read header fields
    let rawName = nextOverrideName || nameField.toString("utf-8").replace(/\0.*$/, "").trim();
    if (nextOverrideName && nextOverrideName.includes("\0")) {
      throw new Error(`Security Violation: Null byte in archive path detected.`);
    }
    nextOverrideName = null;

    // Check ustar prefix (bytes 345..500)
    const prefix = headerBlock.subarray(345, 500).toString("utf-8").replace(/\0.*$/, "").trim();
    if (prefix && !rawName.startsWith(prefix)) {
      rawName = `${prefix}/${rawName}`;
    }

    // File size in octal (bytes 124..136)
    const sizeStr = headerBlock.subarray(124, 136).toString("utf-8").replace(/\0.*$/, "").trim();
    const fileSize = parseInt(sizeStr, 8) || 0;

    // Type flag (byte 156)
    const typeFlag = String.fromCharCode(headerBlock[156] || 48); // '0' is 48

    // Read content bytes (padded to 512-byte block)
    const paddedSize = Math.ceil(fileSize / 512) * 512;
    if (offset + paddedSize > tarBuffer.length) {
      break; // Truncated tar archive
    }
    const fileData = tarBuffer.subarray(offset, offset + fileSize);
    offset += paddedSize;

    // Handle GNU LongName / Pax header (typeflag 'L' or 'x')
    if (typeFlag === "L") {
      nextOverrideName = fileData.toString("utf-8").replace(/\0.*$/, "").trim();
      continue;
    }

    // Strict Entry Type Enforcement:
    // Reject symlinks ('2'), hardlinks ('1'), char devices ('3'), block devices ('4'), FIFOs ('6')
    if (typeFlag === "2") {
      throw new Error(`Security Violation: Prohibited tar entry type: Malicious symlink detected ("${rawName}").`);
    }
    if (typeFlag === "1") {
      throw new Error(`Security Violation: Prohibited tar entry type: Hard link detected ("${rawName}").`);
    }
    if (typeFlag === "3" || typeFlag === "4") {
      throw new Error(`Security Violation: Prohibited tar entry type: Device entry detected ("${rawName}").`);
    }
    if (typeFlag === "6") {
      throw new Error(`Security Violation: Prohibited tar entry type: FIFO/pipe entry detected ("${rawName}").`);
    }

    // Absolute paths, backslashes, drive letters, and traversal checks on rawName
    if (rawName.startsWith("/") || rawName.startsWith("\\")) {
      throw new Error(`Security Violation: Absolute path detected in archive entry ("${rawName}").`);
    }
    if (rawName.includes("\\")) {
      throw new Error(`Security Violation: Backslash in archive path detected ("${rawName}").`);
    }
    if (/^[a-zA-Z]:/.test(rawName)) {
      throw new Error(`Security Violation: Drive letter detected in archive entry ("${rawName}").`);
    }
    if (rawName.includes("..") || rawName.split("/").some((p) => p === "..")) {
      throw new Error(`Security Violation: Path traversal detected in archive entry ("${rawName}").`);
    }

    // Strip top-level directory (GitHub archives wrap files in <owner>-<repo>-<sha>/)
    const parts = rawName.split("/").filter(Boolean);
    if (parts.length <= 1) {
      continue; // Root directory entry itself
    }
    const relativePath = parts.slice(1).join("/");

    // Path length validation
    if (relativePath.length > opts.maxPathLength || rawName.length > opts.maxPathLength) {
      throw new Error(
        `Security Violation: Path length (${Math.max(relativePath.length, rawName.length)}) exceeds maximum allowed length of ${opts.maxPathLength} characters.`
      );
    }

    // Secondary path validation on relative path
    if (
      relativePath.includes("\0") ||
      relativePath.includes("..") ||
      relativePath.startsWith("/") ||
      relativePath.includes("\\") ||
      /^[a-zA-Z]:/.test(relativePath)
    ) {
      throw new Error(`Security Violation: Path traversal detected in archive entry ("${relativePath}").`);
    }

    // Skip directories (typeflag '5' or trailing slash)
    if (typeFlag === "5" || rawName.endsWith("/")) {
      continue;
    }

    // Single file size limit enforcement (streaming abort)
    if (fileSize > opts.maxSingleFileSize) {
      throw new Error(
        `Security Violation: File "${relativePath}" exceeds maximum single file size limit of ${opts.maxSingleFileSize} bytes.`
      );
    }

    // Skip ignored directories
    if (IGNORED_PREFIXES.some((p) => relativePath.startsWith(p) || relativePath.includes("/" + p))) {
      continue;
    }

    // Abort if exceeding max file count cap
    if (files.length >= opts.maxFileCount) {
      throw new Error(
        `Security Violation: Repository exceeds maximum file count limit of ${opts.maxFileCount}.`
      );
    }

    const ext = relativePath.includes(".") ? relativePath.split(".").pop()?.toLowerCase() : undefined;
    const isBinary = ext ? BINARY_EXTENSIONS.has(ext) : false;
    const language = detectLanguage(ext, relativePath);

    totalBytes += fileSize;
    if (totalBytes > opts.maxTotalExtractedBytes) {
      throw new Error(`Extracted repository content exceeds maximum total size of ${(opts.maxTotalExtractedBytes / (1024 * 1024)).toFixed(0)} MB.`);
    }

    const repoFile: RepositoryFile = {
      path: relativePath,
      size: fileSize,
      type: "blob",
      sha: "",
      language,
      extension: ext,
      isBinary
    };

    files.push(repoFile);

    // If text file under max file size, store content in memory
    if (!isBinary && fileSize <= opts.maxFileSize) {
      contents.set(relativePath, fileData.toString("utf-8"));
    }
  }

  return {
    files,
    contents,
    totalFilesExtracted: files.length,
    totalBytesExtracted: totalBytes
  };
}
