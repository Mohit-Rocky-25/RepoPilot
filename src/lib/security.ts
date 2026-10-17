/**
 * Centralized Application Security and Defensive Validation Module
 * Enforces strict input validation, SSRF prevention, path traversal defense, and XSS sanitization.
 */
export { sanitizeSvg } from "./svgSanitizer";

// Strict GitHub owner/repo identifier regex: alphanumeric, underscores, hyphens, periods (1-100 chars)
const GITHUB_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

// Prohibited path traversal sequences and characters
const PATH_TRAVERSAL_REGEX = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

/**
 * Validates GitHub owner handle
 */
export function validateGitHubOwner(owner: unknown): boolean {
  if (typeof owner !== "string" || !owner.trim()) return false;
  const clean = owner.trim();
  if (clean === "." || clean === "..") return false;
  return GITHUB_NAME_REGEX.test(clean);
}

/**
 * Validates GitHub repository name
 */
export function validateGitHubRepo(repo: unknown): boolean {
  if (typeof repo !== "string" || !repo.trim()) return false;
  const clean = repo.trim();
  if (clean === "." || clean === "..") return false;
  return GITHUB_NAME_REGEX.test(clean);
}

/**
 * Validates Git commit SHA or revision ref
 */
export function validateGitRevision(sha: unknown): boolean {
  if (!sha) return true; // Optional, defaults to HEAD
  if (typeof sha !== "string") return false;
  const clean = sha.trim();
  // Validates standard SHA-1/SHA-256 hex or common branch names
  return /^[a-zA-Z0-9_./-]{1,64}$/.test(clean) && !clean.includes("..");
}

/**
 * Validates repository relative file path (prevents path traversal)
 */
export function validateFilePath(filePath: unknown): boolean {
  if (typeof filePath !== "string" || !filePath.trim()) return false;
  const clean = filePath.trim();

  // Block null bytes
  if (clean.includes("\0")) return false;

  // Block leading slash / backslash (must be repository-relative)
  if (clean.startsWith("/") || clean.startsWith("\\")) return false;

  // Block directory traversal sequences: ../ or ..\
  if (PATH_TRAVERSAL_REGEX.test(clean) || clean.includes("..")) return false;

  // Length limit (max 512 chars)
  if (clean.length > 512) return false;

  return true;
}

/**
 * Checks if an IPv4 or IPv6 string belongs to private, loopback, link-local, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ipStr: string): boolean {
  const ip = ipStr.trim().toLowerCase();

  // IPv6 Loopback & Unspecified
  if (ip === "::1" || ip === "::" || ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // IPv6 ULA (Unique Local Address fc00::/7 -> fc00 to fdff)
  if (ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }

  // IPv6 Link-Local (fe80::/10 -> fe80 to febf)
  if (/^fe[89ab]/.test(ip)) {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (ip.startsWith("::ffff:") || ip.startsWith("0:0:0:0:0:ffff:")) {
    const v4Part = ip.split(":").pop();
    if (v4Part && isPrivateOrReservedIp(v4Part)) {
      return true;
    }
  }

  // IPv4 Decimal integer notation (e.g., 2852039166 -> 169.254.169.254, 2130706433 -> 127.0.0.1)
  if (/^\d{8,11}$/.test(ip)) {
    return true;
  }

  // IPv4 Hex/Octal notation
  if (/^0x[0-9a-f]+$/i.test(ip) || /^0[0-7]+$/.test(ip)) {
    return true;
  }

  // Standard IPv4 checks
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [b0, b1] = parts;

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;

    // 10.0.0.0/8 (Private RFC1918)
    if (b0 === 10) return true;

    // 172.16.0.0/12 (Private RFC1918: 172.16 - 172.31)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16 (Private RFC1918)
    if (b0 === 192 && b1 === 168) return true;

    // 169.254.0.0/16 (Link-Local & Cloud Metadata AWS/GCP/Azure/DO)
    if (b0 === 169 && b1 === 254) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 224.0.0.0/4 (Multicast: 224-239)
    if (b0 >= 224 && b0 <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future use: 240-255)
    if (b0 >= 240) return true;
  }

  return false;
}

/**
 * Validates an AI endpoint URL against SSRF vulnerabilities.
 * Allows loopback ONLY for local Ollama on port 11434 if allowLoopbackOllama is true.
 * For hosted providers, enforces HTTPS and resolves DNS to verify no private IP resolution.
 */
export async function validateAiEndpoint(
  urlStr: unknown,
  options?: { allowLoopbackOllama?: boolean }
): Promise<{ valid: boolean; reason?: string }> {
  if (!urlStr || typeof urlStr !== "string") {
    return { valid: true };
  }

  const clean = urlStr.trim();
  if (!clean) return { valid: true };

  if (clean.length > 512) {
    return { valid: false, reason: "URL length exceeds maximum limit of 512 characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { valid: false, reason: "Malformed URL format." };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";

  // Handle local Ollama
  if (isLoopback) {
    if (!options?.allowLoopbackOllama) {
      return {
        valid: false,
        reason: "Loopback connections are not allowed for hosted providers."
      };
    }
    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    if (port !== "11434") {
      return {
        valid: false,
        reason: "Loopback connections are strictly restricted to default Ollama port 11434."
      };
    }
    return { valid: true };
  }

  // Hosted providers MUST use HTTPS
  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      reason: "Remote AI endpoints must use secure https:// protocol."
    };
  }

  // Block cloud internal hostnames
  if (
    hostname.includes("metadata.google.internal") ||
    hostname.includes("metadata.azure") ||
    hostname.includes("instance-data") ||
    hostname.includes("internal")
  ) {
    return { valid: false, reason: "Access to internal cloud metadata hostnames is prohibited." };
  }

  // Check if hostname itself is directly a private/reserved IP
  if (isPrivateOrReservedIp(hostname)) {
    return {
      valid: false,
      reason: "Direct IP connection to private or reserved subnets is prohibited (SSRF defense)."
    };
  }

  // Resolve DNS to prevent DNS-rebinding attacks where a public domain points to 169.254.169.254 or 127.0.0.1
  try {
    const dnsModule = await import("dns");
    const addresses = await dnsModule.promises.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        return {
          valid: false,
          reason: `DNS lookup for ${hostname} resolved to private/restricted IP (${addr.address}). Request blocked.`
        };
      }
    }
  } catch (err: any) {
    // If DNS resolution fails, reject to prevent SSRF through unresolvable host probing
    return {
      valid: false,
      reason: `Could not resolve hostname: ${hostname}. Error: ${err.code || err.message}`
    };
  }

  return { valid: true };
}

/**
 * Synchronous backward-compatible validator for Ollama endpoints.
 */
export function validateOllamaEndpoint(urlStr: unknown): { valid: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== "string") return { valid: true };
  const clean = urlStr.trim();
  if (!clean) return { valid: true };

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, reason: "Only http:// or https:// protocols are permitted." };
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

    if (isLoopback) {
      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (port !== "11434") {
        return {
          valid: false,
          reason: "Loopback connections are strictly restricted to default Ollama port 11434."
        };
      }
      return { valid: true };
    }

    if (isPrivateOrReservedIp(hostname) || hostname === "169.254.169.254") {
      return {
        valid: false,
        reason: "Access to cloud metadata and private RFC1918 subnets is prohibited."
      };
    }

    if (
      hostname.includes("metadata.google.internal") ||
      hostname.includes("metadata.azure") ||
      hostname.includes("instance-data") ||
      hostname.includes("internal")
    ) {
      return { valid: false, reason: "Access to internal cloud metadata hostnames is prohibited." };
    }

    if (clean.length > 256) {
      return { valid: false, reason: "URL length exceeds maximum limit (256 characters)." };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Malformed URL format." };
  }
}
