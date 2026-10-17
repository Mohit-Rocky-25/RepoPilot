/**
 * Centralized Application Security and Defensive Validation Module
 * Enforces strict input validation, SSRF prevention, path traversal defense, and XSS sanitization.
 */

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
 * SSRF Prevention Validator for Local AI / Ollama Endpoints
 * Strictly prohibits link-local cloud metadata, private cloud VPC IPs, and arbitrary ports.
 */
export function validateOllamaEndpoint(urlStr: unknown): { valid: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { valid: true }; // Uses default
  }

  const clean = urlStr.trim();
  if (!clean) return { valid: true };

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { valid: false, reason: "Malformed URL format." };
  }

  // Enforce http or https protocol only
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "Only http:// or https:// protocols are permitted." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Block Cloud Metadata IP (AWS, GCP, Azure, DigitalOcean)
  if (hostname === "169.254.169.254" || hostname.startsWith("169.254.")) {
    return { valid: false, reason: "Access to cloud metadata endpoints is prohibited (SSRF defense)." };
  }

  // 2. Block Cloud internal metadata hostnames
  if (
    hostname.includes("metadata.google.internal") ||
    hostname.includes("metadata.azure") ||
    hostname.includes("instance-data") ||
    hostname.includes("internal")
  ) {
    return { valid: false, reason: "Access to internal cloud metadata hostnames is prohibited." };
  }

  // 3. Allow loopback ONLY on standard Ollama port 11434 (prevents loopback port scanning)
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

  // 4. Block Private RFC1918 subnets for non-localhost endpoints
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { valid: false, reason: "Access to private RFC1918 subnet 10.0.0.0/8 is prohibited." };
  }
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { valid: false, reason: "Access to private RFC1918 subnet 172.16.0.0/12 is prohibited." };
  }
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { valid: false, reason: "Access to private RFC1918 subnet 192.168.0.0/16 is prohibited." };
  }

  // Length limit
  if (clean.length > 256) {
    return { valid: false, reason: "URL length exceeds maximum limit (256 characters)." };
  }

  return { valid: true };
}

/**
 * Lightweight SVG XSS Sanitizer
 * Strips script tags, javascript: schemes, and inline event handlers from SVG strings.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg) return "";

  return rawSvg
    // Remove <script> tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove on* event handlers (e.g. onload, onerror, onclick)
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    // Remove javascript: URI schemes
    .replace(/href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'href="#"')
    .replace(/xlink:href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'xlink:href="#"');
}
