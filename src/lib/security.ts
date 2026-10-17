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

  // Block null bytes (literal or hex encoded %00)
  if (clean.includes("\0") || /%00/i.test(clean)) return false;

  // Block Windows drive letter absolute paths (e.g. C:\ or C:/)
  if (/^[a-zA-Z]:[/\\]/.test(clean)) return false;

  // Block leading slash, backslash, or UNC network paths (\\)
  if (clean.startsWith("/") || clean.startsWith("\\")) return false;

  // Repeatedly URL-decode up to 3 times to prevent double/nested URL-encoding bypasses (%252e%252e%252f)
  let decoded = clean;
  for (let i = 0; i < 3; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      return false; // Malformed percent-encoding
    }
  }

  // Check again on decoded string
  if (
    decoded.includes("\0") ||
    /%00/i.test(decoded) ||
    decoded.startsWith("/") ||
    decoded.startsWith("\\") ||
    /^[a-zA-Z]:[/\\]/.test(decoded)
  ) {
    return false;
  }

  // Block directory traversal sequences: ../ or ..\ or .. alone
  if (
    PATH_TRAVERSAL_REGEX.test(clean) ||
    clean.includes("..") ||
    PATH_TRAVERSAL_REGEX.test(decoded) ||
    decoded.includes("..")
  ) {
    return false;
  }

  // Length limit (max 512 chars)
  if (clean.length > 512 || decoded.length > 512) return false;

  return true;
}

/**
 * Parses an IPv4 token (decimal, hex with 0x, or octal with leading 0).
 */
function parseIpToken(token: string): number | null {
  const t = token.trim();
  if (/^0x[0-9a-f]+$/i.test(t)) {
    const val = parseInt(t, 16);
    return isNaN(val) ? null : val;
  }
  if (/^0[0-7]+$/.test(t)) {
    const val = parseInt(t, 8);
    return isNaN(val) ? null : val;
  }
  if (/^\d+$/.test(t)) {
    const val = parseInt(t, 10);
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * Parses any standard IPv4 notation (1 to 4 parts: decimal, hex, octal, shorthand) into a 32-bit unsigned number.
 */
function parseIpv4ToUint32(ipStr: string): number | null {
  const parts = ipStr.split(".");
  if (parts.length > 4 || parts.length === 0) return null;
  const parsedParts: number[] = [];
  for (const part of parts) {
    const val = parseIpToken(part);
    if (val === null || val < 0) return null;
    parsedParts.push(val);
  }

  let num = 0;
  if (parsedParts.length === 1) {
    num = parsedParts[0];
  } else if (parsedParts.length === 2) {
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xffffff) return null;
    num = ((parsedParts[0] << 24) >>> 0) + parsedParts[1];
  } else if (parsedParts.length === 3) {
    if (parsedParts[0] > 0xff || parsedParts[1] > 0xff || parsedParts[2] > 0xffff) return null;
    num = ((parsedParts[0] << 24) >>> 0) + (parsedParts[1] << 16) + parsedParts[2];
  } else if (parsedParts.length === 4) {
    if (parsedParts.some((p) => p > 0xff)) return null;
    num =
      (((parsedParts[0] << 24) >>> 0) +
        (parsedParts[1] << 16) +
        (parsedParts[2] << 8) +
        parsedParts[3]) >>>
      0;
  }
  return num >>> 0;
}

/**
 * Checks if a 32-bit unsigned IPv4 integer falls into private, loopback, or reserved ranges.
 */
function isPrivateUint32(num: number): boolean {
  const b0 = (num >>> 24) & 0xff;
  const b1 = (num >>> 16) & 0xff;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 10.0.0.0/8 (Private RFC1918)
  if (b0 === 10) return true;
  // 172.16.0.0/12 (Private RFC1918: 172.16.0.0 - 172.31.255.255)
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

  return false;
}

/**
 * Checks if an IPv4 or IPv6 string belongs to private, loopback, link-local, or cloud metadata ranges.
 * Supports decimal integers, hex (0x..), octal (0..), shorthand (127.1), and IPv4-mapped IPv6.
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

  // Check IPv4 in any notation (dotted decimal, hex, octal, shorthand, or integer)
  const v4Num = parseIpv4ToUint32(ip);
  if (v4Num !== null) {
    return isPrivateUint32(v4Num);
  }

  return false;
}

/**
 * Sanitizes an error message or string before returning it to the client.
 * Prevents leaks of absolute file paths, secret tokens, environment values, or stack traces.
 */
export function sanitizeErrorMessage(message: unknown, fallback = "An unexpected error occurred."): string {
  if (!message || typeof message !== "string") {
    return fallback;
  }

  let clean = message;

  // Strip potential Windows absolute paths: C:\Users\... or C:/Users/...
  clean = clean.replace(/[a-zA-Z]:[\\/][^ \n\r"']+/g, "[REDACTED_PATH]");

  // Strip potential Unix absolute paths: /home/..., /Users/..., /etc/...
  clean = clean.replace(/(?:\/home|\/Users|\/root|\/etc)[^ \n\r"']+/g, "[REDACTED_PATH]");

  // Strip API keys / tokens: sk-..., ghp_..., github_pat_..., Bearer ...
  clean = clean.replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");
  clean = clean.replace(/ghp_[a-zA-Z0-9]{20,}/g, "[REDACTED_TOKEN]");
  clean = clean.replace(/github_pat_[a-zA-Z0-9_]{20,}/g, "[REDACTED_TOKEN]");
  clean = clean.replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, "Bearer [REDACTED]");

  // Remove stack traces if someone threw an error and called String(err)
  clean = clean.replace(/^\s*at\s+.*$/gm, "").trim();

  if (!clean || clean.length === 0) {
    return fallback;
  }

  return clean.slice(0, 300);
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
    hostname === "localhost.localdomain" ||
    hostname === "ip6-localhost" ||
    hostname === "ip6-loopback" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0";

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
