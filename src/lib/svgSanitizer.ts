/**
 * Client-safe Lightweight SVG XSS Sanitizer
 * Strips script tags, inline event handlers, javascript: schemes, foreignObject tags,
 * dangerous data: URLs, and external SVG <use> references.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg) return "";

  return rawSvg
    // Strip <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip <foreignObject>...</foreignObject>
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, "")
    // Strip all inline event handlers: onload, onerror, onclick, onmouseover, etc.
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    // Neutralize javascript: hrefs and xlink:hrefs
    .replace(/\bhref\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'href="#"')
    .replace(/\bxlink:href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, 'xlink:href="#"')
    // Neutralize dangerous data: URLs in href/xlink:href/src (block all data: URLs in anchors or images)
    .replace(/\b(href|xlink:href|src)\s*=\s*['"]\s*data:[^'"]*['"]/gi, '$1="#"')
    // Neutralize external SVG <use> references (only allow internal fragment identifiers like #id)
    .replace(/<use\b([^>]*?)(?:href|xlink:href)\s*=\s*['"]\s*(https?:|\/\/)[^'"]*['"]([^>]*)>/gi, '<use$1href="#"$3>');
}
