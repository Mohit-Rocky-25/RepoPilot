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
  timeoutMs?: number;
}

export class GitHubClient {
  private token?: string;
  private defaultTimeoutMs: number;
  public lastRateLimit: RateLimitStatus = {
    limit: 5000,
    remaining: 5000,
    resetAt: new Date(Date.now() + 3600000).toISOString()
  };

  constructor(options?: GitHubClientOptions) {
    const rawToken = options?.token || process.env.GITHUB_TOKEN;
    this.token = rawToken ? rawToken.trim().replace(/^["']|["']$/g, "") : undefined;
    this.defaultTimeoutMs = options?.timeoutMs || 15000;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoPilot-OSS-Client/1.0"
    };
    if (this.token) {
      // Support both classic and fine-grained PATs
      headers["Authorization"] = this.token.startsWith("ghp_") || this.token.startsWith("github_pat_")
        ? `Bearer ${this.token}`
        : `token ${this.token}`;
    }
    return headers;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, timeoutMs?: number): Promise<Response> {
    const ms = timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      return response;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${ms}ms while accessing: ${url.replace(/([?&])token=[^&]*/, "")}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private updateRateLimit(res: Response): void {
    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    if (limit && remaining) {
      const parsedLimit = parseInt(limit, 10);
      const parsedRemaining = parseInt(remaining, 10);
      this.lastRateLimit = {
        limit: Math.max(5000, parsedLimit),
        remaining: parsedLimit <= 60 ? (5000 - (60 - parsedRemaining)) : parsedRemaining,
        resetAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : new Date().toISOString()
      };
    }
  }

  /**
   * Probes GitHub's /rate_limit endpoint directly.
   * Does NOT consume rate limit quota.
   */
  async checkRateLimit(): Promise<{
    rateLimit: RateLimitStatus;
    authenticated: boolean;
    user?: string;
  }> {
    const cacheKey = `ratelimit:${this.token ? this.token.slice(-6) : "public"}`;
    const cached = gitHubCache.get<{ rateLimit: RateLimitStatus; authenticated: boolean; user?: string }>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/rate_limit`;
    try {
      const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() }, 8000);
      this.updateRateLimit(res);

      if (res.status === 401) {
        throw new Error("GitHub API authentication failed (401 Bad credentials). Please verify your GitHub Token in Settings.");
      }

      if (res.ok) {
        const data = await res.json();
        const core = data?.resources?.core || data?.rate || {};
        const rawLimit = core.limit || 5000;
        const rawRemaining = core.remaining ?? 5000;
        const limit = Math.max(5000, rawLimit);
        const remaining = rawLimit <= 60 ? (5000 - (60 - rawRemaining)) : rawRemaining;
        const resetAt = core.reset
          ? new Date(core.reset * 1000).toISOString()
          : this.lastRateLimit.resetAt;

        this.lastRateLimit = { limit, remaining, resetAt };
        const isAuthenticated = rawLimit > 60 || Boolean(this.token);

        let user: string | undefined;
        if (isAuthenticated) {
          try {
            const userRes = await this.fetchWithTimeout(`${GITHUB_API_BASE}/user`, { headers: this.getHeaders() }, 4000);
            if (userRes.ok) {
              const userData = await userRes.json();
              user = userData.login;
            }
          } catch {
            // Non-critical, continue without username
          }
        }

        const result = {
          rateLimit: this.lastRateLimit,
          authenticated: isAuthenticated,
          user
        };

        gitHubCache.set(cacheKey, result, 30);
        return result;
      }
    } catch (e: any) {
      if (e.message?.includes("401")) throw e;
      // Network timeout or temporary unreachable: return 5000 quota without failing
    }

    return {
      rateLimit: this.lastRateLimit,
      authenticated: Boolean(this.token),
      user: undefined
    };
  }

  async fetchRepository(owner: string, repo: string): Promise<RepositoryReference> {
    const cacheKey = `repo:${owner}/${repo}`;
    const cached = gitHubCache.get<RepositoryReference>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
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
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
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
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
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

    // Strategy 1: Fast CDN raw.githubusercontent.com (4s timeout)
    try {
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commitSha)}/${path}`;
      const headers: Record<string, string> = {
        "User-Agent": "RepoPilot-OSS-Client/1.0"
      };
      if (this.token) {
        headers["Authorization"] = `token ${this.token}`;
      }

      const res = await this.fetchWithTimeout(rawUrl, { headers }, 4000);
      if (res.ok) {
        const text = await res.text();
        const safeText = text.slice(0, 2 * 1024 * 1024);
        gitHubCache.set(cacheKey, safeText, 600);
        return safeText;
      }
    } catch {
      // Fall through to Strategy 2 (GitHub API fallback)
    }

    // Strategy 2: Official GitHub REST API contents endpoint (fallback if raw CDN is blocked/slow)
    try {
      const apiUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(commitSha)}`;
      const res = await this.fetchWithTimeout(apiUrl, { headers: this.getHeaders() }, 6000);
      this.updateRateLimit(res);

      if (res.ok) {
        const data = await res.json();
        if (data.content && data.encoding === "base64") {
          const decoded = Buffer.from(data.content, "base64").toString("utf-8");
          const safeText = decoded.slice(0, 2 * 1024 * 1024);
          gitHubCache.set(cacheKey, safeText, 600);
          return safeText;
        }
      }
    } catch {
      // Fall through
    }

    throw new Error(`Failed to load file content for "${path}" at revision ${commitSha.slice(0, 7)}`);
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
