/**
 * Client-side fetch wrapper for RepoPilot API routes.
 * Automatically injects the user's stored GitHub Personal Access Token (if saved in Settings)
 * and optional Bring-Your-Own-Key AI credentials stored exclusively in sessionStorage.
 */
export async function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  if (typeof window !== "undefined") {
    // 1. GitHub Token
    try {
      const storedGhToken = sessionStorage.getItem("REPOPILOT_GH_TOKEN") || localStorage.getItem("REPOPILOT_GH_TOKEN");
      if (storedGhToken && storedGhToken.trim() && !headers.has("x-github-token")) {
        headers.set("x-github-token", storedGhToken.trim());
      }
    } catch {
      // Storage access restricted
    }

    // 2. BYO AI Provider credentials (STRICTLY sessionStorage ONLY)
    try {
      const byoKey = sessionStorage.getItem("REPOPILOT_BYO_AI_KEY");
      const byoBaseUrl = sessionStorage.getItem("REPOPILOT_BYO_AI_BASE_URL");
      const byoModel = sessionStorage.getItem("REPOPILOT_BYO_AI_MODEL");
      const aiProvider = sessionStorage.getItem("REPOPILOT_AI_PROVIDER");

      if (byoKey && !headers.has("x-ai-key")) {
        headers.set("x-ai-key", byoKey.trim());
      }
      if (byoBaseUrl && !headers.has("x-ai-base-url")) {
        headers.set("x-ai-base-url", byoBaseUrl.trim());
      }
      if (byoModel && !headers.has("x-ai-model")) {
        headers.set("x-ai-model", byoModel.trim());
      }
      if (aiProvider && !headers.has("x-ai-provider")) {
        headers.set("x-ai-provider", aiProvider.trim());
      }
    } catch {
      // SessionStorage restricted
    }
  }

  return fetch(input, {
    ...init,
    headers
  });
}
