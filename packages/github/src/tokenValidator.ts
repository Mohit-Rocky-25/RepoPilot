/**
 * GitHub Personal Access Token & Scope Validation Module
 *
 * Implements least-privilege verification:
 * - Detects token type (Fine-grained PAT, Classic PAT, OAuth)
 * - Inspects OAuth scopes via X-OAuth-Scopes header
 * - Flags broad or dangerous permissions (admin, workflow, delete_repo, user write)
 * - Provides step-by-step guidance for least-privilege token creation
 */

import { safeGitHubFetch } from "./safeFetch";

export type TokenType = "fine-grained" | "classic" | "oauth" | "unknown";

export interface ScopeDetail {
  name: string;
  category: "read" | "write" | "admin" | "other";
  isElevated: boolean;
  description: string;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: string;
  name?: string;
  tokenType: TokenType;
  scopes: string[];
  elevatedScopes: string[];
  hasBroadScopes: boolean;
  warning?: string;
  recommendation: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
  error?: string;
}

const ELEVATED_SCOPES_MAP: Record<string, string> = {
  "admin:org": "Full administrative control of organizations and teams",
  "admin:repo_hook": "Full control of repository hooks",
  "admin:org_hook": "Full control of organization hooks",
  "admin:public_key": "Full control of user public SSH keys",
  "admin:gpg_key": "Full control of user GPG keys",
  "admin:enterprise": "Full enterprise administrative control",
  "delete_repo": "Permission to completely delete repositories",
  "workflow": "Ability to update GitHub Actions workflow files",
  "write:packages": "Upload or modify packages in GitHub Packages",
  "delete:packages": "Delete packages from GitHub Packages",
  "user": "Full read/write access to user profile and email",
  "write:org": "Edit org memberships and settings",
  "write:discussion": "Write access to team discussions"
};

/**
 * Classifies token format based on GitHub token prefix conventions.
 */
export function classifyTokenType(token: string): TokenType {
  const clean = token.trim();
  if (clean.startsWith("github_pat_")) return "fine-grained";
  if (clean.startsWith("ghp_")) return "classic";
  if (clean.startsWith("gho_")) return "oauth";
  return "unknown";
}

/**
 * Parses comma-separated scopes from GitHub API X-OAuth-Scopes response header.
 */
export function parseOAuthScopes(header: string | null | undefined): string[] {
  if (!header || !header.trim()) return [];
  return header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Evaluates scopes to detect elevated permissions and excessive privileges.
 */
export function analyzeTokenScopes(
  scopes: string[],
  tokenType: TokenType
): {
  elevatedScopes: string[];
  hasBroadScopes: boolean;
  warning?: string;
  recommendation: string;
} {
  const elevatedScopes: string[] = [];

  for (const scope of scopes) {
    if (ELEVATED_SCOPES_MAP[scope] || scope.startsWith("admin:")) {
      elevatedScopes.push(scope);
    }
  }

  let warning: string | undefined;
  let recommendation: string;

  if (elevatedScopes.length > 0) {
    warning = `Token has broad scopes (${elevatedScopes.join(", ")}). RepoPilot operates strictly read-only and never requires admin, workflow, or user write permissions.`;
    recommendation = "Recommend switching to a Fine-Grained Personal Access Token with only 'Contents: Read-only' and 'Metadata: Read-only' permissions.";
  } else if (scopes.includes("repo")) {
    warning = "Classic 'repo' scope grants full read AND write access to all your private repositories.";
    recommendation = "For optimal security, use a Fine-Grained PAT restricted to only the specific repository you are analyzing.";
  } else if (tokenType === "fine-grained") {
    recommendation = "Fine-grained token detected. Ensure permissions are set to 'Contents: Read-only' for least privilege.";
  } else if (scopes.includes("public_repo")) {
    recommendation = "Scope 'public_repo' provides 5,000 req/hr for public repositories. To inspect private repos, use a fine-grained token.";
  } else {
    recommendation = "Token verified with minimal scopes.";
  }

  return {
    elevatedScopes,
    hasBroadScopes: elevatedScopes.length > 0 || scopes.includes("repo"),
    warning,
    recommendation
  };
}

/**
 * Validates a GitHub Personal Access Token or OAuth token by verifying identity
 * and inspecting granted scopes against GitHub API.
 */
export async function validateGitHubToken(
  token: string,
  options?: {
    fetchFn?: typeof fetch;
    baseUrl?: string;
  }
): Promise<TokenValidationResult> {
  const trimmed = token.trim();
  const tokenType = classifyTokenType(trimmed);

  if (!trimmed) {
    return {
      valid: false,
      tokenType: "unknown",
      scopes: [],
      elevatedScopes: [],
      hasBroadScopes: false,
      recommendation: "Please provide a valid GitHub token.",
      error: "Token cannot be empty."
    };
  }

  const baseUrl = options?.baseUrl || "https://api.github.com";
  const userUrl = `${baseUrl}/user`;
  const fetcher = options?.fetchFn || safeGitHubFetch;

  try {
    const authHeader =
      trimmed.startsWith("ghp_") || trimmed.startsWith("github_pat_")
        ? `Bearer ${trimmed}`
        : `token ${trimmed}`;

    const res = await fetcher(userUrl, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: authHeader,
        "User-Agent": "RepoPilot-OSS-Client/1.0"
      }
    });

    if (res.status === 401) {
      return {
        valid: false,
        tokenType,
        scopes: [],
        elevatedScopes: [],
        hasBroadScopes: false,
        recommendation: "Generate a new token at GitHub Settings > Developer settings.",
        error: "GitHub API authentication failed (401 Bad credentials). Please verify your token."
      };
    }

    if (res.status === 403) {
      return {
        valid: false,
        tokenType,
        scopes: [],
        elevatedScopes: [],
        hasBroadScopes: false,
        recommendation: "Check if the token has expired or if IP rate limits apply.",
        error: "Access forbidden (403). The token may have expired or rate limit was reached."
      };
    }

    if (!res.ok) {
      return {
        valid: false,
        tokenType,
        scopes: [],
        elevatedScopes: [],
        hasBroadScopes: false,
        recommendation: "Verify your network connection and token status.",
        error: `GitHub API returned HTTP ${res.status}.`
      };
    }

    const userData = (await res.json()) as { login?: string; name?: string };
    const rawScopes = res.headers.get("x-oauth-scopes");
    const scopes = parseOAuthScopes(rawScopes);

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");

    const rateLimit = limitHeader && remainingHeader ? {
      limit: parseInt(limitHeader, 10),
      remaining: parseInt(remainingHeader, 10),
      resetAt: resetHeader
        ? new Date(parseInt(resetHeader, 10) * 1000).toISOString()
        : new Date(Date.now() + 3600000).toISOString()
    } : undefined;

    const { elevatedScopes, hasBroadScopes, warning, recommendation } = analyzeTokenScopes(
      scopes,
      tokenType
    );

    return {
      valid: true,
      user: userData.login,
      name: userData.name,
      tokenType,
      scopes,
      elevatedScopes,
      hasBroadScopes,
      warning,
      recommendation,
      rateLimit
    };
  } catch (err: any) {
    return {
      valid: false,
      tokenType,
      scopes: [],
      elevatedScopes: [],
      hasBroadScopes: false,
      recommendation: "Check connection to api.github.com.",
      error: err.message || "Failed to communicate with GitHub API."
    };
  }
}
