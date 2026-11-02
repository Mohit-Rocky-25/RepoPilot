/**
 * Official Brand Asset Generator for RepoPilot
 * Generates vector SVGs and pixel-perfect raster assets across all standard dimensions:
 * - public/logo.svg, public/logo-mark.svg, public/favicon.svg
 * - public/logo.png (512x512), public/logo-512.png (512x512), public/logo-192.png (192x192)
 * - public/apple-touch-icon.png (180x180), public/favicon-32x32.png (32x32)
 * - public/og-image.jpg (1200x630), public/banner.jpg (1200x630)
 * - assets/repopilot_logo.svg, assets/repopilot_mark.svg, assets/repo_pilot_logo.jpg
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const publicDir = path.resolve(__dirname, '../public');
const assetsDir = path.resolve(__dirname, '../assets');

// 1. Full Squircle App Icon SVG (512x512)
const svgFull = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rpi-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E131F" />
      <stop offset="100%" stop-color="#07090E" />
    </linearGradient>
    <radialGradient id="rpi-glow" cx="256" cy="240" r="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="rpi-left" x1="100" y1="80" x2="256" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="rpi-right" x1="256" y1="80" x2="410" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="rpi-keel" x1="256" y1="260" x2="256" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="rpi-core" x1="230" y1="198" x2="282" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="116" fill="url(#rpi-bg)" />
  <rect x="1.5" y="1.5" width="509" height="509" rx="114.5" stroke="#1E283D" stroke-width="3" />
  <circle cx="256" cy="240" r="200" fill="url(#rpi-glow)" />

  <path d="M256 68 L100 354 L208 322 L256 220 Z" fill="url(#rpi-left)" />
  <path d="M256 68 L256 220 L304 322 L412 354 Z" fill="url(#rpi-right)" />
  <path d="M256 266 L304 322 L256 444 L208 322 Z" fill="url(#rpi-keel)" />
  <circle cx="256" cy="220" r="26" fill="#FFFFFF" />
  <circle cx="256" cy="220" r="14" fill="url(#rpi-core)" />
  <circle cx="100" cy="354" r="12" fill="#60A5FA" />
  <circle cx="100" cy="354" r="5" fill="#FFFFFF" />
  <circle cx="412" cy="354" r="12" fill="#93C5FD" />
  <circle cx="412" cy="354" r="5" fill="#FFFFFF" />
</svg>`;

// 2. Transparent Vector Mark (512x512)
const svgMarkOnly = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rpm-left" x1="100" y1="80" x2="256" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="rpm-right" x1="256" y1="80" x2="410" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="rpm-keel" x1="256" y1="260" x2="256" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="rpm-core" x1="230" y1="198" x2="282" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <filter id="rpm-glow" x="40" y="30" width="432" height="432" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#3B82F6" flood-opacity="0.35" />
    </filter>
  </defs>

  <g filter="url(#rpm-glow)">
    <path d="M256 68 L100 354 L208 322 L256 220 Z" fill="url(#rpm-left)" />
    <path d="M256 68 L256 220 L304 322 L412 354 Z" fill="url(#rpm-right)" />
    <path d="M256 266 L304 322 L256 444 L208 322 Z" fill="url(#rpm-keel)" />
    <circle cx="256" cy="220" r="26" fill="#FFFFFF" />
    <circle cx="256" cy="220" r="14" fill="url(#rpm-core)" />
    <circle cx="100" cy="354" r="12" fill="#60A5FA" />
    <circle cx="100" cy="354" r="5" fill="#FFFFFF" />
    <circle cx="412" cy="354" r="12" fill="#93C5FD" />
    <circle cx="412" cy="354" r="5" fill="#FFFFFF" />
  </g>
</svg>`;

// 3. Crisp Favicon (32x32)
const svgFavicon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="#0D111A" />
  <path d="M16 4.5 L6.5 22 L13 20 L16 13.5 Z" fill="#3B82F6" />
  <path d="M16 4.5 L16 13.5 L19 20 L25.5 22 Z" fill="#60A5FA" />
  <path d="M16 16.5 L19 20 L16 27.5 L13 20 Z" fill="#818CF8" />
  <circle cx="16" cy="13.5" r="2.5" fill="#FFFFFF" />
</svg>`;

async function main() {
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgFull);
  fs.writeFileSync(path.join(publicDir, 'logo-mark.svg'), svgMarkOnly);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
  fs.writeFileSync(path.join(assetsDir, 'repopilot_logo.svg'), svgFull);
  fs.writeFileSync(path.join(assetsDir, 'repopilot_mark.svg'), svgMarkOnly);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const svgPath = path.join(publicDir, 'logo.svg').replace(/\\/g, '/');

  const renders = [
    { name: 'logo.png', width: 512, height: 512, format: 'png', targetDir: publicDir },
    { name: 'logo-512.png', width: 512, height: 512, format: 'png', targetDir: publicDir },
    { name: 'logo-192.png', width: 192, height: 192, format: 'png', targetDir: publicDir },
    { name: 'apple-touch-icon.png', width: 180, height: 180, format: 'png', targetDir: publicDir },
    { name: 'favicon-32x32.png', width: 32, height: 32, format: 'png', targetDir: publicDir },
    { name: 'logo.jpg', width: 512, height: 512, format: 'jpeg', targetDir: publicDir },
    { name: 'repo_pilot_logo.jpg', width: 512, height: 512, format: 'jpeg', targetDir: assetsDir },
  ];

  for (const r of renders) {
    await page.setViewportSize({ width: r.width, height: r.height });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;"><img src="file:///${svgPath}" style="width:${r.width}px;height:${r.height}px;display:block;" /></body></html>`);
    const out = path.join(r.targetDir, r.name);
    if (r.format === 'jpeg') {
      await page.screenshot({ path: out, type: 'jpeg', quality: 95 });
    } else {
      await page.screenshot({ path: out, type: 'png' });
    }
  }

  await browser.close();
  console.log('✅ Official RepoPilot brand assets generated successfully.');
}

main().catch(console.error);
