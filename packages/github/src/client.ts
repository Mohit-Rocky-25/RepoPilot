import type {
  RepositoryReference,
  RepositoryRevision,
  RepositoryFile,
  RateLimitStatus
} from "@repopilot/core";
import { gitHubCache } from "./cache";
import { extractTarballSafely, type ExtractedRepository } from "./tarballExtractor";
import { globalRepoCache } from "./repoCache";

const GITHUB_API_BASE = "https://api.github.com";

// Allowed hostnames for tarball downloads and redirects
const ALLOWED_TARBALL_HOSTS = new Set(["api.github.com", "codeload.github.com"]);

export interface GitHubClientOptions {
  token?: string;
  timeoutMs?: number;
}

export class GitHubClient {
  private token?: string;
  private defaultTimeoutMs: number;
  private apiCallCount = 0;

  public lastRateLimit: RateLimitStatus = {
    limit: 60,
    remaining: 60,
    resetAt: new Date(Date.now() + 3600000).toISOString()
  };

  constructor(options?: GitHubClientOptions) {
    const rawToken = options?.token || process.env.GITHUB_TOKEN;
    this.token = rawToken ? rawToken.trim().replace(/^["']|["']$/g, "") : undefined;
    this.defaultTimeoutMs = options?.timeoutMs || 20000;
  }

  public getApiCallCount(): number {
    return this.apiCallCount;
  }

  public resetApiCallCount(): void {
    this.apiCallCount = 0;
  }

  private getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoPilot-OSS-Client/1.0",
      ...extraHeaders
    };
    if (this.token) {
      headers["Authorization"] = this.token.startsWith("ghp_") || this.token.startsWith("github_pat_")
        ? `Bearer ${this.token}`
        : `token ${this.token}`;
    }
    return headers;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, timeoutMs?: number): Promise<Response> {
    this.apiCallCount += 1;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[GitHub API Call #${this.apiCallCount}] ${init?.method || "GET"} ${url.split("?")[0]}`);
    }

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
        limit: parsedLimit,
        remaining: parsedRemaining,
        resetAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : new Date().toISOString()
      };
    }
  }

  private handleCommonHttpErrors(res: Response, owner: string, repo: string): void {
    if (res.status === 401) {
      throw new Error("GitHub API authentication failed (401 Bad credentials). Please verify your GitHub Token in Settings.");
    }
    if (res.status === 403) {
      throw new Error(
        `GitHub API rate limit exceeded (${this.lastRateLimit.remaining}/${this.lastRateLimit.limit}). Reset at ${this.lastRateLimit.resetAt}. Configure a GitHub Token in settings to raise quota to 5,000 req/hr.`
      );
    }
    if (res.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private. If it is private, configure a Personal Access Token in Settings.`);
    }
    if (res.status >= 500) {
      throw new Error(`GitHub API appears to be temporarily down or unreachable (HTTP ${res.status}). Please check https://www.githubstatus.com.`);
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
        const limit = core.limit ?? 60;
        const remaining = core.remaining ?? 60;
        const resetAt = core.reset ? new Date(core.reset * 1000).toISOString() : new Date().toISOString();

        const statusResult = {
          rateLimit: { limit, remaining, resetAt },
          authenticated: Boolean(this.token && limit > 60),
          user: data?.resources ? undefined : undefined
        };

        gitHubCache.set(cacheKey, statusResult, 60); // 1 min cache
        return statusResult;
      }
    } catch {
      // Fall through to returning last known rate limit
    }

    return {
      rateLimit: this.lastRateLimit,
      authenticated: Boolean(this.token && this.lastRateLimit.limit > 60)
    };
  }

  /**
   * Resolves repository reference metadata (API call #1)
   */
  async getRepository(owner: string, repo: string): Promise<RepositoryReference> {
    return this.fetchRepository(owner, repo);
  }

  async fetchRepository(owner: string, repo: string): Promise<RepositoryReference> {
    const cacheKey = `repo:${owner}/${repo}`;
    const cached = gitHubCache.get<RepositoryReference>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    this.handleCommonHttpErrors(res, owner, repo);

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

    gitHubCache.set(cacheKey, result, 600);
    return result;
  }

  /**
   * Resolves the immutable commit revision SHA for a ref (API call #2)
   */
  async resolveRevision(owner: string, repo: string, ref?: string): Promise<RepositoryRevision> {
    const targetRef = ref || "HEAD";
    const cacheKey = `rev:${owner}/${repo}:${targetRef}`;
    const cached = gitHubCache.get<RepositoryRevision>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(targetRef)}`;
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    this.handleCommonHttpErrors(res, owner, repo);

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

  /**
   * Downloads and safely extracts repository tarball in a single stream (API call #3).
   * Resulting files and text contents are cached immutably under "owner/repo@sha".
   */
  async downloadAndExtractTarball(
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<ExtractedRepository> {
    const repoCacheKey = `${owner}/${repo}@${commitSha}`;
    const cached = globalRepoCache.get(repoCacheKey);
    if (cached) {
      return cached;
    }

    const tarballEndpoint = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tarball/${encodeURIComponent(commitSha)}`;

    // Follow redirect manually to strictly validate destination hostname against codeload.github.com
    const initialRes = await this.fetchWithTimeout(
      tarballEndpoint,
      {
        headers: this.getHeaders(),
        redirect: "manual"
      },
      15000
    );
    this.updateRateLimit(initialRes);

    this.handleCommonHttpErrors(initialRes, owner, repo);

    let downloadUrl = tarballEndpoint;
    let downloadHeaders = this.getHeaders();

    if (initialRes.status === 302 || initialRes.status === 301) {
      const redirectLocation = initialRes.headers.get("location");
      if (!redirectLocation) {
        throw new Error("Tarball download failed: Missing redirect Location header from GitHub.");
      }

      const parsedRedirect = new URL(redirectLocation);
      if (!ALLOWED_TARBALL_HOSTS.has(parsedRedirect.hostname)) {
        throw new Error(`Security Violation: Tarball download redirect target "${parsedRedirect.hostname}" is not allowlisted.`);
      }

      downloadUrl = redirectLocation;
      // Do not send GitHub Authorization headers to third-party endpoints, but codeload accepts standard headers
      downloadHeaders = { "User-Agent": "RepoPilot-OSS-Client/1.0" };
    }

    const downloadRes = await this.fetchWithTimeout(downloadUrl, { headers: downloadHeaders }, 25000);
    if (!downloadRes.ok) {
      throw new Error(`Failed to download repository tarball (HTTP ${downloadRes.status}).`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extracted = extractTarballSafely(buffer, {
      maxArchiveSizeBytes: 25 * 1024 * 1024,
      maxFileCount: 1500,
      maxFileSize: 100 * 1024
    });

    globalRepoCache.set(repoCacheKey, extracted);
    return extracted;
  }

  /**
   * Fetches repository tree. Prioritizes single tarball stream; falls back to Git trees API.
   */
  async fetchTree(owner: string, repo: string, treeOrCommitSha: string): Promise<RepositoryFile[]> {
    const repoCacheKey = `${owner}/${repo}@${treeOrCommitSha}`;
    const cachedRepo = globalRepoCache.get(repoCacheKey);
    if (cachedRepo) {
      return cachedRepo.files;
    }

    // Try primary high-efficiency tarball stream first (1 API call for entire repo)
    try {
      const extracted = await this.downloadAndExtractTarball(owner, repo, treeOrCommitSha);
      return extracted.files;
    } catch (tarballErr) {
      // If tarball fails (e.g. empty repository or codeload transient issue), fall back to trees API
    }

    const cacheKey = `tree:${owner}/${repo}:${treeOrCommitSha}`;
    const cached = gitHubCache.get<RepositoryFile[]>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeOrCommitSha)}?recursive=1`;
    const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() });
    this.updateRateLimit(res);

    this.handleCommonHttpErrors(res, owner, repo);

    if (!res.ok) {
      throw new Error(`Could not retrieve repository tree for sha ${treeOrCommitSha}`);
    }

    const data = await res.json();
    const rawTree = Array.isArray(data.tree) ? data.tree : [];

    const IGNORED_PREFIXES = [
      "node_modules/", ".git/", "dist/", "build/", ".next/", "vendor/", "target/", "venv/", ".venv/", "__pycache__/"
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

      if (IGNORED_PREFIXES.some((p) => path.startsWith(p) || path.includes("/" + p))) {
        continue;
      }

      const ext = path.includes(".") ? path.split(".").pop()?.toLowerCase() : undefined;
      const isBinary = ext ? BINARY_EXTENSIONS.has(ext) : false;
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

      if (files.length >= 1500) break;
    }

    gitHubCache.set(cacheKey, files, 600);
    return files;
  }

  /**
   * Fetches single file content.
   * Checks the in-memory extracted tarball cache first (0 API calls if repository was ingested via tarball).
   */
  async fetchFileContent(
    owner: string,
    repo: string,
    commitSha: string,
    path: string
  ): Promise<string> {
    // Check in-memory repository archive cache (Zero API Calls!)
    const repoCacheKey = `${owner}/${repo}@${commitSha}`;
    const cachedRepo = globalRepoCache.get(repoCacheKey);
    if (cachedRepo) {
      const content = cachedRepo.contents.get(path);
      if (content !== undefined) {
        return content;
      }
    }

    const cacheKey = `blob:${owner}/${repo}:${commitSha}:${path}`;
    const cached = gitHubCache.get<string>(cacheKey);
    if (cached !== null) return cached;

    // Strategy 1: Fast CDN raw.githubusercontent.com
    try {
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commitSha)}/${path}`;
      const headers: Record<string, string> = { "User-Agent": "RepoPilot-OSS-Client/1.0" };
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
      // Fall through to Strategy 2
    }

    // Strategy 2: Official GitHub REST API contents endpoint
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
