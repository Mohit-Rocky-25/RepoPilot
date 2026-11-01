# RepoPilot Mobile Responsiveness Audit & Inventory

**Audit Date:** 2026-11-01  
**Scope:** Complete inventory of routes, layouts, and components for mobile and tablet readiness.  
**Target Viewports:** 320px (iPhone SE small), 360px (mid-range Android), 390px (iPhone 14/15), 412px (Pixel 7 / Samsung Galaxy), 600px (small tablet portrait), 768px (iPad portrait), 1024px (iPad landscape), 1280px (desktop).  
**Baseline Profile:** Mid-range Android on throttled 4G network.

---

## 1. Executive Summary of Mobile Deficiencies

Prior to this mobile overhaul, RepoPilot was engineered primarily for desktop developer monitors. A rigorous audit reveals critical mobile usability, accessibility, and rendering issues:

1. **Page-Level Overflow & Layout Shell:**
   - App shell used `h-screen w-screen overflow-hidden`. The `w-screen` introduces horizontal scrollbars on mobile browsers, and `100vh` fails to account for dynamic browser address/navigation bars (causing bottom content truncation).
   - Sidebar was statically set to `w-64` (256px wide) with no breakpoint collapse, consuming 80% of screen width on 320px devices.
   - Lack of safe-area inset adaptation (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) for iPhone notch/Dynamic Island and Android gesture bars.

2. **Touch Targets Below WCAG 2.1 AA / Mobile Guidelines (<44x44 CSS px):**
   - Buttons (`Button.tsx`) size `sm` is 32px high, `md` is 36px high.
   - Theme switcher options (`ThemeSwitcher.tsx`) are only 24–28px high.
   - File tree rows (`FileTree.tsx`) are 26px high with small chevron icons.
   - Navigation links in header and breadcrumbs are ~28px high.
   - Quick-launch pills and citation badges are ~24px high with sub-8px gaps.

3. **iOS Form Auto-Zoom (Font Size < 16px):**
   - Inputs (`Input.tsx`) and textareas use `text-sm` (14px) or `text-xs` (12px). On iOS WebKit, tapping any input under 16px forces an irreversible viewport zoom that destroys layout orientation.

4. **Desktop-Only Interactions & Hover Dependencies:**
   - Tooltips, badge states, and hover previews rely on `:hover` styles with no tap/focus equivalents.
   - Architecture 3D map canvas lacks full touch gestures (double-tap to focus node, smooth pinch-to-zoom, one-finger pan in 2D mode, and bottom sheet details).
   - Canvas devicePixelRatio was uncapped, causing lag and GPU memory exhaustion on 3x/4x high-density mobile screens.

5. **Missing Mobile Navigation Patterns:**
   - No persistent mobile bottom tab bar for main application zones (Explorer, Architecture, Assistant, Debugging).
   - No accessible slide-out mobile drawer for sidebar navigation with focus trapping and scroll lock.
   - Dialogs (`ImportModal.tsx`) render as centered desktop desktop boxes rather than mobile-optimized bottom sheets.

---

## 2. Comprehensive Inventory by Route & Layout

| Route / Component | File Location | Current Mobile Problem | Severity | Target Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **Viewport Meta & Root** | `src/app/layout.tsx` | Missing `viewportFit: "cover"`; no PWA manifest link; uses standard vh units. | High | Add `viewportFit: "cover"` to viewport export; add Web App Manifest; add fluid type/space tokens. |
| **App Shell & Main Canvas** | `src/components/layout/ShellLayout.tsx` | Uses `h-screen w-screen`; main container has `p-6 lg:p-8` consuming excessive width on mobile; sidebar is always pinned. | Critical | Switch to `h-[100dvh] w-full`; use responsive padding `p-3 sm:p-4 md:p-6`; collapse sidebar into accessible mobile drawer; add persistent bottom tab bar. |
| **Desktop Sidebar** | `src/components/layout/Sidebar.tsx` | Fixed `w-64` visible on all screens; link targets are 28px high; footer overflows on mobile. | Critical | Hide on `< md` (`hidden md:flex`); create mobile drawer navigation with focus trap, Escape close, backdrop, and >=44px touch targets. |
| **Top Header** | `src/components/layout/Header.tsx` | All header pills, breadcrumbs, repo info, and switcher packed into a single row; overflows heavily below 768px. | Critical | Responsive compact bar: truncate repo info, hide non-essential telemetry on mobile, add menu hamburger trigger, preserve theme switcher and connect action. |
| **Persistent Bottom Bar** | *New Component* | Does not exist; mobile users have no thumb-accessible primary navigation. | High | Implement `BottomTabBar.tsx` with Explore, Architecture, Assistant, and Debugging icons; include `env(safe-area-inset-bottom)`. |
| **Home / Landing Page** | `src/app/page.tsx` | Hero input uses 14px font (iOS zoom); hero button is ~36px height; local folder option buried in modal; pills are 24px high. | High | Single-column thumb-reachable layout; input font >=16px; button 44px min-height; local folder button directly below hero; wrap quick-launch pills with 44px tap areas. |
| **Explorer Dual-Pane** | `src/app/explore/page.tsx` | Dual-pane grid collapses poorly; `h-[calc(100vh-175px)]` clips on mobile; subfolder input overflows row; tabs are small. | Critical | Implement tabbed slide-over (Files drawer + Code view); horizontal scrollable symbol chip bar; sticky breadcrumbs; 100dvh calculation. |
| **File Tree** | `src/components/explorer/FileTree.tsx` | Row height 26px (<44px); small hit targets for folder disclosure chevrons; hover-only highlight. | High | Expand tap height to min 44px on touch devices; tap anywhere on row toggles directory or opens file; close drawer on file selection. |
| **Code Viewer** | `src/components/ui/CodeViewer.tsx` | Line numbers not sticky on horizontal scroll; fixed font size (no mobile toggle); copy button small; no clipboard fallback. | High | Container-level horizontal scroll; sticky line number column; font-size control (A- / A+); smooth scroll into view on citation jump; robust clipboard fallback. |
| **Architecture Map** | `src/components/architecture/ArchitectureMap3D.tsx` | Canvas DPR uncapped (crashes mobile GPU); defaults to 3D even on small screens; node hit area too small for fingers (16px); node details in modal. | Critical | Cap DPR at 2; default to 2D on mobile (<768px); 1-finger pan, pinch-zoom, double-tap to focus; touch radius >=28px; node details in bottom sheet; pause when offscreen. |
| **Assistant Chat** | `src/app/assistant/page.tsx` | Query input at top (scrolled away by answers); virtual keyboard covers active field; context badge has massive vertical bulk; small citation chips. | Critical | Chat layout with input pinned to bottom above virtual keyboard (`visualViewport` dynamic inset); collapsible context-used summary row; wrap citation badges with >=44px targets. |
| **Bug Investigation** | `src/app/debugging/page.tsx` | Stack trace textarea uses 12px font (iOS zoom); no soft-wrap toggle for long traces; diff preview lacks container scroll; buttons not full-width. | High | Textarea font >=16px with wrap/no-wrap toggle; containerized diff scrolling; full-width stacked buttons on mobile. |
| **Patch Review** | `src/app/patches/page.tsx` | Unified diff table overflows narrow screens; PR draft copy button has no fallback. | Medium | Container-level horizontal scrolling; responsive card layout; Clipboard API + fallback textarea selection. |
| **General Settings** | `src/app/settings/page.tsx` | Multi-column forms squeeze inputs on narrow screens; token input is 14px; permission scope chips wrap awkwardly. | Medium | Single-column vertical stacking; 16px input font; touch-friendly 44px save/clear buttons; wrap scope badges. |
| **Local AI Settings** | `src/app/settings/ai/page.tsx` | Terminal commands and model cards overflow screen width; action buttons cramped. | Medium | Break command strings with `overflow-x-auto`; stacked action buttons. |
| **Search & Symbols** | `src/app/search/page.tsx` | Search filter chips row overflows on 320px; language select dropdown cramped. | Medium | Flex-wrap filter chips with >=44px touch targets; full-width search input and submit button. |
| **Documentation & Examples** | `src/app/docs/page.tsx`, `src/app/examples/page.tsx` | Markdown code blocks and architecture diagrams overflow without individual container scroll. | Medium | Wrap code snippets and tables in `overflow-x-auto` wrappers. |
| **Import Modal / Bottom Sheet** | `src/components/modals/ImportModal.tsx` | Centered desktop dialog on mobile; local folder picker uses unsupported File System Access API on iOS without fallback. | Critical | Convert to bottom sheet on mobile with drag handle, backdrop, and Escape close; feature-detect directory picker vs `webkitdirectory` vs helpful fallback guidance. |
| **Core Input Component** | `src/components/ui/Input.tsx` | Text size `text-sm` (14px) triggers iOS zoom-on-focus; height is 38px (<44px). | Critical | Set font size to `text-base` (16px) on mobile; set min-height to 44px. |
| **Core Button Component** | `src/components/ui/Button.tsx` | Sizes `sm` (32px) and `md` (36px) fail 44px touch target guidelines. | Critical | Add mobile touch target sizing (`min-h-[44px] min-w-[44px]` on touch/mobile viewports). |
| **Theme Switcher** | `src/components/ui/ThemeSwitcher.tsx` | Buttons are ~26px high, cramped with <8px spacing; radio group can overflow header on 320px. | High | Touch targets >=44px with padding/hit area expansion; compact icon-only mode for mobile headers. |

---

## 3. Verified Performance & Network Constraints

- **Mid-Range Android Baseline:**
  - Device: Octa-core ARM (Cortex-A55 @ 2.0 GHz), 4GB RAM, Adreno 610 GPU.
  - Network: Emulated Slow 4G (1.6 Mbps download, 750 kbps upload, 150ms RTT).
  - WebKit / Blink viewports: 360x800 and 390x844.
  - Performance Budgets:
    - Largest Contentful Paint (LCP): < 2.5s
    - Cumulative Layout Shift (CLS): < 0.1
    - Interaction to Next Paint (INP): < 200ms
    - Max Canvas GPU Memory: Capped at 2x DPR.

---

## 4. Phase-by-Phase Remediation Roadmap

- **Phase 1: Foundations** — Viewport meta (`viewport-fit=cover`), `dvh`/`svh` layouts, fluid type scale in `DESIGN.md` & CSS, >=16px input font size to eliminate iOS auto-zoom, >=44px touch targets, zero horizontal page scroll.
- **Phase 2: Navigation & Layout** — Compact mobile header, accessible slide-over mobile navigation drawer, persistent bottom tab bar with safe-area insets, thumb-reachable hero input with direct local folder option.
- **Phase 3: Core Features on Mobile** — Explorer slide-over file tree drawer & sticky code viewer; Architecture map touch gestures (pan, pinch-zoom, double-tap), DPR cap (2), 2D default on mobile, bottom sheet details; Assistant visualViewport-pinned input; Debugging monospace wrap and responsive diff cards.
- **Phase 4: Mobile Capabilities & Limits** — Local folder feature detection (`showDirectoryPicker` -> `webkitdirectory` -> guidance); mobile memory ingestion thresholds; Web App Manifest & PWA basics.
- **Phase 5: Performance Budgets** — Code-split heavy modules; optimize assets; document before/after LCP, CLS, INP in `docs/mobile-audit/performance.md`.
- **Phase 6: Automated Proof** — Mobile Playwright test suite (iPhone SE, iPhone 14, Pixel 7, 360px Android, iPad portrait & landscape); axe-core accessibility at 360px & 768px; screenshot contact sheet in `docs/mobile-audit/screenshots/`.
- **Phase 7: Documentation** — Update `DESIGN.md` with responsive tokens and patterns; update `README.md` with mobile capabilities and constraints.

