/**
 * Client-safe Lightweight SVG XSS Sanitizer
 * Strips script tags, javascript: schemes, and inline event handlers from SVG strings.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg) return "";

  return rawSvg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'href="#"')
    .replace(/xlink:href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'xlink:href="#"');
}
