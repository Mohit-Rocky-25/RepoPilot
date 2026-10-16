/**
 * Client-side fetch wrapper for RepoPilot API routes.
 * Automatically injects the user's stored GitHub Personal Access Token (if saved in Settings),
 * ensuring requests utilize the authenticated 5,000 req/hr quota instead of the 60 req/hr limit.
 */
export async function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  if (typeof window !== "undefined") {
    try {
      const storedToken = localStorage.getItem("REPOPILOT_GH_TOKEN");
      if (storedToken && storedToken.trim() && !headers.has("x-github-token")) {
        headers.set("x-github-token", storedToken.trim());
      }
    } catch {
      // LocalStorage access restricted (e.g. iframe or strict privacy mode)
    }
  }

  return fetch(input, {
    ...init,
    headers
  });
}
