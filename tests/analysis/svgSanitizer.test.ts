import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "../../src/lib/svgSanitizer";

describe("SVG Sanitizer - Comprehensive XSS Defenses", () => {
  it("strips <script> tags and embedded executable code", () => {
    const maliciousSvg = `<svg><script>alert('xss')</script><circle cx="50" cy="50" r="40" /></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert('xss')");
    expect(sanitized).toContain("<circle cx=\"50\" cy=\"50\" r=\"40\" />");
  });

  it("strips inline event handlers (onload, onerror, onclick)", () => {
    const maliciousSvg = `<svg onload="evil()" onerror="evil()"><rect width="10" height="10" onclick="evil()" /></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain("onload=");
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).not.toContain("onclick=");
  });

  it("neutralizes javascript: href and xlink:href pseudo-protocols", () => {
    const maliciousSvg = `<svg><a href="javascript:alert(1)"><text>Click</text></a><a xlink:href="javascript:evil()"><text>Link</text></a></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain('href="javascript:');
    expect(sanitized).not.toContain('xlink:href="javascript:');
    expect(sanitized).toContain('href="#"');
    expect(sanitized).toContain('xlink:href="#"');
  });

  it("strips <foreignObject> tags containing embedded HTML or iframes", () => {
    const maliciousSvg = `<svg><foreignObject width="100" height="50"><body xmlns="http://www.w3.org/1999/xhtml"><iframe src="http://evil.com"></iframe></body></foreignObject><path d="M0,0" /></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain("<foreignObject");
    expect(sanitized).not.toContain("</iframe>");
    expect(sanitized).toContain('<path d="M0,0" />');
  });

  it("neutralizes dangerous data: URLs in links and images", () => {
    const maliciousSvg = `<svg><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="><text>Evil</text></a><image href="data:image/svg+xml;utf8,<svg onload=alert(1)>" /></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain('href="data:');
    expect(sanitized).toContain('href="#"');
  });

  it("neutralizes external SVG <use> references", () => {
    const maliciousSvg = `<svg><use href="https://evil.com/payload.svg#icon" /><use xlink:href="//attacker.com/test.svg#x" /><use href="#local-icon" /></svg>`;
    const sanitized = sanitizeSvg(maliciousSvg);

    expect(sanitized).not.toContain('href="https://evil.com');
    expect(sanitized).not.toContain('xlink:href="//attacker.com');
    // Local fragment identifiers should remain untouched
    expect(sanitized).toContain('href="#local-icon"');
  });
});
