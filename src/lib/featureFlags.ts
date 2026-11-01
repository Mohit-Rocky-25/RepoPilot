/**
 * Central Feature Flags Registry for RepoPilot
 *
 * Global Rule: Large or experimental features (GitHub App OAuth, Multi-repo workspaces)
 * MUST ship behind feature flags, disabled by default.
 */

export const FEATURE_FLAGS = {
  /**
   * GitHub App OAuth 2.0 flow with PKCE & sessionStorage handoff.
   * Default: false (PAT in sessionStorage is the standard path).
   */
  ENABLE_GITHUB_APP_OAUTH:
    process.env.ENABLE_GITHUB_APP_OAUTH === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_GITHUB_APP_OAUTH === "true",

  /**
   * Multi-repository unified workspace indexing and cross-repo navigation.
   * Default: false (Single repo analysis is current production scope).
   */
  ENABLE_MULTI_REPO:
    process.env.ENABLE_MULTI_REPO === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MULTI_REPO === "true"
} as const;

export function isOAuthEnabled(): boolean {
  return Boolean(
    process.env.ENABLE_GITHUB_APP_OAUTH === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_GITHUB_APP_OAUTH === "true"
  );
}

export function isMultiRepoEnabled(): boolean {
  return Boolean(
    process.env.ENABLE_MULTI_REPO === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MULTI_REPO === "true"
  );
}
