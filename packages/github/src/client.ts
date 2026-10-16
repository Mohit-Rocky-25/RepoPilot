import type {
  RepositoryReference,
  RepositoryRevision,
  RepositoryFile,
  RateLimitStatus
} from "@repopilot/core";
import { gitHubCache } from "./cache";

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubClientOptions {
  token?: string;
}

export class GitHubClient {
  private token?: string;
  public lastRateLimit: RateLimitStatus = {
    limit: 60,
    remaining: 60,
    resetAt: new Date(Date.now() + 3600000).toISOString()
  };

  constructor(options?: GitHubClientOptions) {
    this.token = options?.token || process.env.GITHUB_TOKEN;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoPilot-OSS-Client/1.0"
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private updateRateLimit(res: Response): void {
    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    if (limit && remaining) {
      this.lastRateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : new Date().toISOString()
      };
    }
  }

  async fetchRepository(owner: string, repo: string): Promise<RepositoryReference> {
    const cacheKey = `repo:${owner}/${repo}`;
    const cached = gitHubCache.get<RepositoryReference>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    if (res.status === 401) {
      throw new Error("GitHub API authentication failed (401 Bad credentials). Please verify your GitHub Token in Settings or remove it to use unauthenticated public access.");
    }

    if (res.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found on GitHub or is private.`);
    }

    if (res.status === 403) {
      throw new Error(
        `GitHub API rate limit exceeded. Remaining quota: ${this.lastRateLimit.remaining}/${this.lastRateLimit.limit}. Reset at ${this.lastRateLimit.resetAt}. Configure a GitHub Token in settings to raise quota to 5,000 req/hr.`
      );
    }

    if (!res.ok) {
      throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();

    const result: RepositoryReference = {
      owner: data.owner?.login || owner,
      repo: data.name || repo,
      url: data.html_url || `https://github.com/${owner}/${repo}`,
      fullName: data.full_name || `${owner}/${repo}`,
      defaultBranch: data.default_branch || "main",
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      description: data.description || "",
      primaryLanguage: data.language || null,
      openIssuesCount: data.open_issues_count ?? 0,
      license: data.license?.spdx_id || data.license?.name || null
    };

    gitHubCache.set(cacheKey, result, 600); // 10 min cache
    return result;
  }

  async resolveRevision(owner: string, repo: string, ref?: string): Promise<RepositoryRevision> {
    const targetRef = ref || "HEAD";
    const cacheKey = `rev:${owner}/${repo}:${targetRef}`;
    const cached = gitHubCache.get<RepositoryRevision>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(targetRef)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    if (res.status === 401) {
      throw new Error("GitHub API authentication failed (401 Bad credentials). Please verify your GitHub Token in Settings.");
    }

    if (res.status === 403) {
      throw new Error(`GitHub API rate limit exceeded (${this.lastRateLimit.remaining}/${this.lastRateLimit.limit}). Reset at ${this.lastRateLimit.resetAt}. Configure a GitHub Token in settings to raise quota to 5,000 req/hr.`);
    }

    if (!res.ok) {
      throw new Error(`Could not resolve commit revision for "${targetRef}" in ${owner}/${repo}`);
    }

    const data = await res.json();

    const revision: RepositoryRevision = {
      commitSha: data.sha,
      treeSha: data.commit?.tree?.sha || data.sha,
      author: data.commit?.author?.name || data.author?.login || "Unknown",
      date: data.commit?.author?.date || new Date().toISOString(),
      message: data.commit?.message?.split("\n")[0] || ""
    };

    gitHubCache.set(cacheKey, revision, 600);
    return revision;
  }

  async fetchTree(owner: string, repo: string, treeSha: string): Promise<RepositoryFile[]> {
    const cacheKey = `tree:${owner}/${repo}:${treeSha}`;
    const cached = gitHubCache.get<RepositoryFile[]>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`;
    const res = await fetch(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    if (res.status === 401) {
      throw new Error("GitHub API authentication failed (401 Bad credentials). Please verify your GitHub Token in Settings.");
    }

    if (res.status === 403) {
      throw new Error(`GitHub API rate limit exceeded (${this.lastRateLimit.remaining}/${this.lastRateLimit.limit}). Reset at ${this.lastRateLimit.resetAt}. Configure a GitHub Token in settings to raise quota to 5,000 req/hr.`);
    }

    if (!res.ok) {
      throw new Error(`Could not retrieve repository tree for sha ${treeSha}`);
    }

    const data = await res.json();
    const rawTree = Array.isArray(data.tree) ? data.tree : [];

    // Ignored directory patterns
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
      "pdf", "doc", "docx", "mp3", "mp4", "wav"
    ]);

    const files: RepositoryFile[] = [];

    for (const item of rawTree) {
      const path: string = item.path;
      if (!path) continue;

      // Filter ignored directories
      if (IGNORED_PREFIXES.some((p) => path.startsWith(p) || path.includes("/" + p))) {
        continue;
      }

      const ext = path.includes(".") ? path.split(".").pop()?.toLowerCase() : undefined;
      const isBinary = ext ? BINARY_EXTENSIONS.has(ext) : false;

      // Classify language
      const language = detectLanguage(ext, path);

      files.push({
        path,
        size: item.size ?? 0,
        type: item.type === "blob" ? "blob" : "tree",
        sha: item.sha,
        language,
        extension: ext,
        isBinary
      });

      // Cap at 1,500 files to stay responsive within zero-budget browser/server constraints
      if (files.length >= 1500) break;
    }

    gitHubCache.set(cacheKey, files, 600);
    return files;
  }

  async fetchFileContent(
    owner: string,
    repo: string,
    commitSha: string,
    path: string
  ): Promise<string> {
    const cacheKey = `blob:${owner}/${repo}:${commitSha}:${path}`;
    const cached = gitHubCache.get<string>(cacheKey);
    if (cached !== null) return cached;

    // Use raw.githubusercontent.com for fast, low-rate-limit text retrieval
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commitSha)}/${path}`;
    const res = await fetch(rawUrl, {
      headers: {
        "User-Agent": "RepoPilot-OSS-Client/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to load file content for ${path} at ${commitSha.slice(0, 7)}`);
    }

    const text = await res.text();
    // Cap in-memory content to 2MB per file
    const safeText = text.slice(0, 2 * 1024 * 1024);
    gitHubCache.set(cacheKey, safeText, 600);
    return safeText;
  }
}

function detectLanguage(ext?: string, path?: string): string | undefined {
  if (!ext && !path) return undefined;

  const filename = path?.split("/").pop()?.toLowerCase();
  if (filename === "dockerfile") return "Dockerfile";
  if (filename === "makefile") return "Makefile";

  switch (ext) {
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
    case "rs":
      return "Rust";
    case "go":
      return "Go";
    case "java":
      return "Java";
    case "c":
    case "h":
      return "C";
    case "cpp":
    case "hpp":
    case "cc":
      return "C++";
    case "cs":
      return "C#";
    case "rb":
      return "Ruby";
    case "php":
      return "PHP";
    case "html":
      return "HTML";
    case "css":
    case "scss":
    case "less":
      return "CSS";
    case "json":
      return "JSON";
    case "yaml":
    case "yml":
      return "YAML";
    case "md":
    case "markdown":
      return "Markdown";
    case "sql":
      return "SQL";
    case "sh":
    case "bash":
      return "Shell";
    default:
      return undefined;
  }
}
