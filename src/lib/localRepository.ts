import type { RepositoryFile, RepositoryReference } from "@repopilot/core";

const IGNORED_DIRECTORIES = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  "vendor",
  "coverage"
];

const IGNORED_FILES = [".DS_Store", "Thumbs.db"];

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "pdf",
  "zip", "tar", "gz", "tgz", "7z", "rar", "exe", "dll",
  "so", "dylib", "wasm", "bin", "woff", "woff2", "ttf", "eot",
  "mp3", "mp4", "mov", "avi", "flac", "pyc", "class", "db", "sqlite"
]);

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  c: "C",
  h: "C",
  cpp: "C++",
  hpp: "C++",
  cc: "C++",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "CSS",
  sass: "CSS",
  less: "CSS",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  md: "Markdown",
  markdown: "Markdown",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  dockerfile: "Dockerfile"
};

const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/**
 * Deterministic fast 32-bit hash converted to hex string for reproducible pseudo-SHAs
 */
export function simpleHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function isPathIgnored(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const seg of segments) {
    if (IGNORED_DIRECTORIES.includes(seg)) {
      return true;
    }
  }

  const filename = segments[segments.length - 1];
  if (IGNORED_FILES.includes(filename)) {
    return true;
  }

  return false;
}

export function detectLanguageFromExtension(filename: string): { extension: string; language: string | undefined } {
  const parts = filename.split(".");
  if (parts.length <= 1) {
    const lower = filename.toLowerCase();
    if (lower === "dockerfile") return { extension: "dockerfile", language: "Dockerfile" };
    return { extension: "", language: undefined };
  }

  const ext = parts[parts.length - 1].toLowerCase();
  const language = EXTENSION_LANGUAGE_MAP[ext];
  return { extension: ext, language };
}

export interface LocalIngestionProgress {
  totalDiscovered: number;
  processed: number;
  currentFile: string;
}

/**
 * Parses files selected from `<input type="file" webkitdirectory />` or drag & drop.
 * Operates 100% in-browser with zero network calls.
 */
export async function parseLocalFolder(
  fileList: FileList | File[],
  onProgress?: (progress: LocalIngestionProgress) => void
): Promise<{ repository: RepositoryReference; files: RepositoryFile[] }> {
  const rawFiles = Array.from(fileList);
  if (rawFiles.length === 0) {
    throw new Error("No files selected in local folder.");
  }

  // Determine top folder name
  let folderName = "local-project";
  for (const f of rawFiles) {
    const relPath = (f as any).webkitRelativePath || f.name;
    const parts = relPath.replace(/\\/g, "/").split("/");
    if (parts.length > 1 && parts[0].trim()) {
      folderName = parts[0].trim();
      break;
    }
  }

  // Sanitize folder name
  const sanitizedRepo = folderName.replace(/[^a-zA-Z0-9_.-]/g, "_") || "workspace";

  // Filter out ignored paths
  const validFiles: { file: File; repoPath: string }[] = [];
  for (const f of rawFiles) {
    const fullRelPath = (f as any).webkitRelativePath || f.name;
    const normalized = fullRelPath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    // Remove folderName prefix if present
    const repoPath = parts.length > 1 && parts[0] === folderName
      ? parts.slice(1).join("/")
      : normalized;

    if (!repoPath || isPathIgnored(repoPath)) {
      continue;
    }

    validFiles.push({ file: f, repoPath });
  }

  if (validFiles.length === 0) {
    throw new Error("No readable source files found in directory (non-code / ignored files excluded).");
  }

  const parsedFiles: RepositoryFile[] = [];
  const langCounts = new Map<string, number>();

  const BATCH_SIZE = 40;
  for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
    const chunk = validFiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async ({ file, repoPath }) => {
        const { extension, language } = detectLanguageFromExtension(repoPath);
        const isBinary = BINARY_EXTENSIONS.has(extension);
        const isTooLarge = file.size > MAX_FILE_SIZE_BYTES;

        let content: string | undefined = undefined;
        let lineCount: number | undefined = undefined;

        if (!isBinary && !isTooLarge) {
          try {
            content = await file.text();
            lineCount = content.split("\n").length;
          } catch {
            // Unreadable as UTF-8, treat as binary
            content = undefined;
          }
        }

        if (language) {
          langCounts.set(language, (langCounts.get(language) || 0) + 1);
        }

        const pseudoSha = `loc_${simpleHash(`${repoPath}:${file.size}:${content?.slice(0, 40) || ""}`)}`;

        parsedFiles.push({
          path: repoPath,
          size: file.size,
          type: "blob",
          sha: pseudoSha,
          language,
          extension: extension || undefined,
          isBinary: isBinary || isTooLarge,
          lineCount,
          content
        });

        if (onProgress) {
          onProgress({
            totalDiscovered: validFiles.length,
            processed: parsedFiles.length,
            currentFile: repoPath
          });
        }
      })
    );
  }

  // Sort files predictably
  parsedFiles.sort((a, b) => a.path.localeCompare(b.path));

  // Determine top language
  let topLang = "TypeScript";
  let maxCount = 0;
  for (const [lang, count] of langCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topLang = lang;
    }
  }

  const repository: RepositoryReference = {
    owner: "local",
    repo: sanitizedRepo,
    fullName: `local/${sanitizedRepo}`,
    url: `local://workspace/${sanitizedRepo}`,
    defaultBranch: "local",
    stars: 0,
    forks: 0,
    openIssuesCount: 0,
    primaryLanguage: topLang,
    description: "Private local project loaded in-browser. Zero network upload.",
    isLocal: true
  };

  return {
    repository,
    files: parsedFiles
  };
}
