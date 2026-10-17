import zlib from "zlib";
import type { RepositoryFile } from "@repopilot/core";

export interface TarballExtractionOptions {
  maxArchiveSizeBytes?: number; // default: 25 MB
  maxTotalExtractedBytes?: number; // default: 50 MB
  maxFileSize?: number; // default: 100 KB
  maxFileCount?: number; // default: 1500
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
  maxFileCount: 1500
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

    // Read header fields
    let rawName = nextOverrideName || headerBlock.subarray(0, 100).toString("utf-8").replace(/\0.*$/, "").trim();
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

    // Reject symlinks escaping the repository (typeflag '2' or '1')
    if (typeFlag === "2" || typeFlag === "1") {
      const linkTarget = headerBlock.subarray(157, 257).toString("utf-8").replace(/\0.*$/, "").trim();
      if (linkTarget.includes("..") || linkTarget.startsWith("/") || linkTarget.startsWith("\\")) {
        throw new Error(`Security Violation: Malicious symlink detected in archive ("${rawName}" -> "${linkTarget}").`);
      }
      continue; // Skip symlink entry
    }

    // Strip top-level directory (GitHub archives wrap files in <owner>-<repo>-<sha>/)
    const parts = rawName.split("/").filter(Boolean);
    if (parts.length <= 1) {
      continue; // Root directory entry itself
    }
    const relativePath = parts.slice(1).join("/");

    // 1. Path Traversal & Security Validation
    if (
      relativePath.includes("\0") ||
      relativePath.includes("..") ||
      relativePath.startsWith("/") ||
      relativePath.startsWith("\\")
    ) {
      throw new Error(`Security Violation: Path traversal detected in archive entry ("${relativePath}").`);
    }

    // Skip directories (typeflag '5' or trailing slash)
    if (typeFlag === "5" || rawName.endsWith("/")) {
      continue;
    }

    // Skip ignored directories
    if (IGNORED_PREFIXES.some((p) => relativePath.startsWith(p) || relativePath.includes("/" + p))) {
      continue;
    }

    // Skip if exceeding max file count
    if (files.length >= opts.maxFileCount) {
      break;
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
