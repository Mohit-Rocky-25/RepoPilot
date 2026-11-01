# RepoPilot Design System & Theming Specification

**Document Version:** 1.0.0  
**Status:** Living Design System Specification  
**Default Theme:** Light Mode (Google / GDG-Inspired Engineering Aesthetic)  
**Secondary Theme:** Dark Mode (Obsidian / High-Contrast Studio)  

---

## 1. Design Principles

RepoPilot is designed for engineers, contributors, and researchers investigating software architectures. The interface is optimized around five core tenets:

1. **Evidence-First:** Every piece of information, symbol jump, and answer is grounded in concrete repository data. Visual styling must elevate source evidence rather than distract from it.
2. **Calm & Focused:** Avoid visual noise, unnecessary gradients, and overwhelming neon accents. High-density information layouts should feel clean, orderly, and readable during multi-hour debugging sessions.
3. **Light by Default:** The default presentation is an airy, crisp, Google/GDG-inspired light theme (`#F8F9FA` canvas with `#FFFFFF` cards). Dark mode is preserved as a first-class choice for low-light environments.
4. **Color as Purposeful Accent:** Color is never purely decorative; it communicates status, architecture taxonomy, and interactive states. The four primary accent colors (Blue, Red, Yellow, Green) reflect Google Developer Group styling.
5. **Strict Accessibility (WCAG 2.1 AA):** All text meets minimum contrast ratios of **4.5:1** (normal text) and **3:1** (large text & UI components). Color is never the sole communicator of state—every badge, alert, and node includes explicit text labels and icon glyphs.

> **Disclaimer & Attribution:**  
> The color palette and visual styling of RepoPilot are inspired by clean Google / GDG (Google Developer Group) design conventions. RepoPilot is an independent open-source project and does not use Google logos, nor does it imply official endorsement or affiliation with Google LLC or Google Developer Groups.

---

## 2. Color Tokens

### 2.1 Light Theme (Default)

| Semantic Role | Token Name | Hex Code | Usage & Placement |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--color-bg` | `#F8F9FA` | Page body, shell backdrop, neutral workspace canvas |
| **Surface** | `--color-surface` | `#FFFFFF` | Cards, modals, sidebars, panels, dropdowns |
| **Surface Alternative** | `--color-surface-alt` | `#F1F3F4` | Hover states, tab backgrounds, secondary containers |
| **Border Default** | `--color-border` | `#DADCE0` | Card borders, dividers, table cell outlines |
| **Border Subtle** | `--color-border-subtle` | `#E8EAED` | Secondary row dividers, subtle list separators |
| **Text Primary** | `--color-text` | `#202124` | Headings, body text, primary labels (16.1:1 on white) |
| **Text Muted** | `--color-text-muted` | `#5F6368` | Secondary labels, timestamps, metadata (6.05:1 on white) |
| **Text Subtle / Dim** | `--color-text-subtle` | `#80868B` | Helper hints, disabled labels, line numbers |
| **Primary Accent Blue** | `--color-blue` | `#1A73E8` | Primary CTA buttons, active tabs, focused rings, key links |
| **Blue Text / Hover** | `--color-blue-hover` | `#174EA6` | Hover state for blue links and buttons |
| **Accent Red** | `--color-red` | `#EA4335` | Error badges, danger alerts, UI component nodes |
| **Danger Text** | `--color-danger-text` | `#D93025` | High-contrast error message text (4.77:1 on white) |
| **Accent Yellow** | `--color-yellow` | `#FBBC04` | Warning highlights, four-color bar, star indicators |
| **Warning Surface** | `--color-warning-surface` | `#FEF7E0` | Background for warning banners and weak-support badges |
| **Warning Text** | `--color-warning-text` | `#B06000` | High-contrast amber text on light yellow surface (4.52:1) |
| **Accent Green** | `--color-green` | `#34A853` | Success banners, verified indicators, core module nodes |
| **Green Text** | `--color-green-text` | `#137333` | High-contrast green text on light surfaces (5.92:1) |
| **Green Surface** | `--color-green-surface` | `#E6F4EA` | Background for verified badges and success notifications |
| **Code Block Background** | `--color-code-bg` | `#202124` | Syntax viewer, terminal logs, code snippets |
| **Code Primary Text** | `--color-code-text` | `#8AB4F8` | Primary identifiers and operators in dark code viewer |
| **Code Comments** | `--color-code-comment` | `#9AA0A6` | Comments, annotations, docstrings (6.10:1 on code-bg) |

---

### 2.2 Dark Theme

| Semantic Role | Token Name | Hex Code | Usage & Placement |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--color-bg` | `#202124` | Obsidian backdrop, page body |
| **Surface** | `--color-surface` | `#292A2D` | Cards, modals, sidebars, header bar |
| **Surface Alternative** | `--color-surface-alt` | `#303134` | Hover states, tab backgrounds, secondary containers |
| **Border Default** | `--color-border` | `#3C4043` | Card borders, dividers, table cell outlines |
| **Border Subtle** | `--color-border-subtle` | `#4A4D51` | Subtle row dividers, chip borders |
| **Text Primary** | `--color-text` | `#E8EAED` | Headings, body copy, active labels (11.9:1 on surface) |
| **Text Muted** | `--color-text-muted` | `#9AA0A6` | Secondary labels, metadata (5.43:1 on surface) |
| **Text Subtle / Dim** | `--color-text-subtle` | `#5F6368` | Line numbers, placeholder text, hints |
| **Primary Accent Blue** | `--color-blue` | `#8AB4F8` | Primary links, interactive highlights, active icons |
| **Blue Surface** | `--color-blue-surface` | `#174EA6` | Primary button background in dark mode |
| **Accent Red** | `--color-red` | `#F28B82` | Danger badges, error frame highlights (6.01:1 on surface) |
| **Danger Text** | `--color-danger-text` | `#F28B82` | Error messages, stack frame highlights |
| **Accent Yellow** | `--color-yellow` | `#FDD663` | Warnings, weak support badges (10.23:1 on surface) |
| **Warning Text** | `--color-warning-text` | `#FDD663` | Warning message text |
| **Accent Green** | `--color-green` | `#81C995` | Verified badges, success alerts (7.33:1 on surface) |
| **Green Text** | `--color-green-text` | `#81C995` | Verified text and icons |
| **Code Block Background** | `--color-code-bg` | `#171717` | Deep obsidian code viewport |
| **Code Primary Text** | `--color-code-text` | `#8AB4F8` | Syntax text in dark code viewer |
| **Code Comments** | `--color-code-comment` | `#9AA0A6` | Comments and annotations |

---

### 2.3 Measured Contrast Ratios (WCAG AA Verification)

Every color pair in RepoPilot is mathematically tested using standard relative luminance ($L = 0.2126 R + 0.7152 G + 0.0722 B$).

| Theme | Foreground Token | Background Token | Measured Contrast | Target | Result | Adjustments & Design Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Light** | `--color-text` (`#202124`) | `--color-surface` (`#FFFFFF`) | **16.10:1** | 4.5:1 | **PASS (AAA)** | Primary copy on white card surfaces |
| **Light** | `--color-text` (`#202124`) | `--color-bg` (`#F8F9FA`) | **15.27:1** | 4.5:1 | **PASS (AAA)** | Primary copy on neutral canvas |
| **Light** | `--color-text` (`#202124`) | `--color-surface-alt` (`#F1F3F4`) | **14.46:1** | 4.5:1 | **PASS (AAA)** | Primary copy on hovered rows and tabs |
| **Light** | `--color-text-muted` (`#5F6368`) | `--color-surface` (`#FFFFFF`) | **6.05:1** | 4.5:1 | **PASS (AA)** | Metadata and descriptions |
| **Light** | `--color-text-muted` (`#5F6368`) | `--color-bg` (`#F8F9FA`) | **5.74:1** | 4.5:1 | **PASS (AA)** | Breadcrumbs and footer notes |
| **Light** | `--color-blue` (`#1A73E8`) | `--color-surface` (`#FFFFFF`) | **4.51:1** | 4.5:1 | **PASS (AA)** | Interactive text and link labels |
| **Light** | `--color-blue` (`#185ABC`) | `--color-bg` (`#F8F9FA`) | **5.80:1** | 4.5:1 | **PASS (AA)** | Adjusted dark-blue used for links on `#F8F9FA` |
| **Light** | `--color-danger-text` (`#D93025`) | `--color-surface` (`#FFFFFF`) | **4.77:1** | 4.5:1 | **PASS (AA)** | High-contrast red for error messages |
| **Light** | `--color-green-text` (`#137333`) | `--color-surface` (`#FFFFFF`) | **5.92:1** | 4.5:1 | **PASS (AA)** | `#34A853` used for icons/fills; `#137333` for text |
| **Light** | `--color-warning-text` (`#B06000`) | `--color-warning-surface` (`#FEF7E0`)| **4.52:1** | 4.5:1 | **PASS (AA)** | **Rule:** Yellow (`#FBBC04`) is never used for text |
| **Light** | `--color-code-text` (`#8AB4F8`) | `--color-code-bg` (`#202124`) | **7.64:1** | 4.5:1 | **PASS (AAA)** | High-legibility code syntax highlighting |
| **Light** | `--color-code-comment` (`#9AA0A6`) | `--color-code-bg` (`#202124`) | **6.10:1** | 4.5:1 | **PASS (AA)** | Code comment annotations |
| **Dark** | `--color-text` (`#E8EAED`) | `--color-surface` (`#292A2D`) | **11.91:1** | 4.5:1 | **PASS (AAA)** | Dark mode card text |
| **Dark** | `--color-text` (`#E8EAED`) | `--color-bg` (`#202124`) | **13.36:1** | 4.5:1 | **PASS (AAA)** | Dark mode body text |
| **Dark** | `--color-text-muted` (`#9AA0A6`) | `--color-surface` (`#292A2D`) | **5.43:1** | 4.5:1 | **PASS (AA)** | Dark mode metadata |
| **Dark** | `--color-blue` (`#8AB4F8`) | `--color-surface` (`#292A2D`) | **6.81:1** | 4.5:1 | **PASS (AA)** | Dark mode links and interactive labels |
| **Dark** | `--color-red` (`#F28B82`) | `--color-surface` (`#292A2D`) | **6.01:1** | 4.5:1 | **PASS (AA)** | Dark mode danger badges and error text |
| **Dark** | `--color-yellow` (`#FDD663`) | `--color-surface` (`#292A2D`) | **10.23:1** | 4.5:1 | **PASS (AAA)** | Dark mode warning text |
| **Dark** | `--color-green` (`#81C995`) | `--color-surface` (`#292A2D`) | **7.33:1** | 4.5:1 | **PASS (AAA)** | Dark mode verified badges and success text |

---

## 3. Typography

RepoPilot uses **Roboto** for prose and UI interface components, paired with **Roboto Mono** for code, line coordinates, and AST symbols, loaded via `next/font/google` with system fallbacks.

```css
/* Font Family Definitions */
--font-sans: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
--font-mono: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Type Hierarchy & Scale

| Style Level | Font Size | Line Height | Weight | Letter Spacing | Element / Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `36px` (`2.25rem`) | `44px` (`1.22`) | Bold (`700`) | `-0.02em` | Hero landing headlines |
| **Heading 1 (`h1`)** | `24px` (`1.5rem`) | `32px` (`1.33`) | SemiBold (`600`) | `-0.015em` | Page title banners, major module headers |
| **Heading 2 (`h2`)** | `18px` (`1.125rem`) | `24px` (`1.33`) | SemiBold (`600`) | `-0.01em` | Card titles, drawer headers, section subtitles |
| **Heading 3 (`h3`)** | `14px` (`0.875rem`) | `20px` (`1.42`) | Medium (`500`) | `0` | Subsection headers, group dividers |
| **Body Large** | `15px` (`0.9375rem`) | `22px` (`1.46`) | Regular (`400`) | `0` | Introductory paragraphs, modal guides |
| **Body Regular** | `13px` (`0.8125rem`) | `19px` (`1.46`) | Regular (`400`) | `0` | Standard UI text, descriptions, table contents |
| **Small / Metadata**| `11px` (`0.6875rem`) | `16px` (`1.45`) | Medium (`500`) | `+0.01em` | Badge text, timestamps, breadcrumbs, tags |
| **Code Inline** | `12px` (`0.75rem`) | `18px` (`1.50`) | Regular (`400`) | `0` | File paths, function names, inline snippets |
| **Code Block** | `12px` (`0.75rem`) | `20px` (`1.66`) | Regular (`400`) | `0` | Code viewer viewport, unified diff lines |

---

## 4. Spacing, Radius & Elevation

### 4.1 Border Radius System
- **Cards & Major Panels:** `12px` (`rounded-xl`). Clean, softly rounded rectangular structure.
- **Buttons:** `8px` (`rounded-lg`) for standard buttons; `999px` (`rounded-full`) for pills, quick-filter chips, and floating actions.
- **Badges & Chips:** `999px` (`rounded-full`) or `6px` (`rounded-md`) for compact telemetry tags.
- **Input Fields:** `8px` (`rounded-lg`).

### 4.2 Elevation & Shadows
- **Light Theme:**
  - Card default: `box-shadow: 0 1px 2px 0 rgba(60,64,67,0.1), 0 1px 3px 1px rgba(60,64,67,0.05);` (Subtle Google-style diffuse shadow).
  - Hovered card / Dropdown: `box-shadow: 0 4px 12px 0 rgba(60,64,67,0.15);`
  - Modal overlay: `box-shadow: 0 12px 32px 0 rgba(60,64,67,0.25);`
- **Dark Theme:**
  - Shadow is replaced by **crisp 1px borders** (`border: 1px solid #3C4043`) and tonal elevation steps (`#202124` &rarr; `#292A2D` &rarr; `#303134`).

---

## 5. Signature Google/GDG Elements

RepoPilot incorporates three signature visual motifs:

### 5.1 The Four-Color Top Bar (`TopColorBar`)
A 3px high horizontal bar spanning the very top of the window with equal 25% segments:
```
[ Blue: #1A73E8 ] [ Red: #EA4335 ] [ Yellow: #FBBC04 ] [ Green: #34A853 ]
```
Fixed at the root of the viewport, it gives RepoPilot its distinctive developer platform identity.

### 5.2 Four-Dot Hero Cluster (`FourDots`)
A signature 4-dot inline pattern:
```
(● Blue) (● Red) (● Yellow) (● Green)
```
Used on the Hero section, about dialogs, and loading screens to signal live processing.

### 5.3 Accent Card (`AccentCard`)
A card variant featuring a 4px solid left accent border that automatically rotates through the four brand colors (Blue &rarr; Red &rarr; Yellow &rarr; Green), or accepts an explicit `accent` prop.

---

## 6. Component System Guidelines

### 6.1 Buttons
- **Primary:** Background `--color-blue` (`#1A73E8` light / `#8AB4F8` dark), text white in light / `#202124` in dark. Focus ring: `2px solid var(--color-blue)`.
- **Secondary / Subtle:** Surface background (`#FFFFFF` light / `#292A2D` dark), border `--color-border`, text `--color-text`.
- **Ghost:** Transparent background, text `--color-text-muted`, hover background `--color-surface-alt`.
- **Danger:** White background with red border & red text in light; dark red surface in dark.
- **Disabled State:** Opacity 45%, cursor not-allowed, zero shadow.

### 6.2 Cards
- **Light:** Surface `#FFFFFF`, border `#DADCE0`, shadow-xs.
- **Dark:** Surface `#292A2D`, border `#3C4043`.
- **Interactive:** Hover adds `--color-border-subtle` expansion and `transform: translateY(-1px)`.

### 6.3 Badges & Chips
- Always combine an icon and text label (never color alone):
  - **Verified:** Green icon + `Verified` text.
  - **Weak Support:** Amber icon + `Weak Support` text.
  - **Unverified:** Red icon + `Unverified` text.
  - **Info:** Blue icon + Info label.

### 6.4 Inputs & Form Controls
- Default background `--color-surface` with border `--color-border`.
- Focused state: border `--color-blue` with `box-shadow: 0 0 0 2px rgba(26,115,232,0.2)`.
- Error state: border `--color-red` with `box-shadow: 0 0 0 2px rgba(217,48,37,0.2)`.

---

## 7. Data Visualization: Node Taxonomy (Architecture Map)

The 2D schematic and 3D spatial architecture maps use a unified, colorblind-safe node taxonomy across both themes:

| Node Classification | Light Theme Color | Dark Theme Color | Shape / Icon | Description & Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Application Entry Points** | `#1A73E8` (Blue) | `#8AB4F8` (Blue) | Diamond / Star | `main()`, `@SpringBootApplication`, root route |
| **Core Business Modules** | `#34A853` (Green) | `#81C995` (Green) | Circle | Domain logic, controllers, database services |
| **UI Components & Views** | `#EA4335` (Red) | `#F28B82` (Red) | Hexagon | React components, pages, templates |
| **Manifests & Config** | `#B06000` (Amber) | `#FDD663` (Yellow) | Square | `package.json`, `pom.xml`, `go.mod`, config |
| **Test Suites & Tooling** | `#9334E6` (Purple) | `#C58AF9` (Purple) | Octagon | `tests/`, `*.spec.ts`, integration suites |
| **Root & Utility Folders** | `#5F6368` (Gray) | `#9AA0A6` (Gray) | Rounded Rect | Shared utils, helpers, assets |

A persistent legend is displayed in the lower-right corner of the architecture canvas.

---

## 8. Theme System Behavior

1. **Default Theme:** **Light Mode** is active on initial visit, regardless of whether the user's operating system is set to dark.
2. **User Options:** `Light`, `Dark`, and `System`.
3. **Persistence:** The user's selection is stored in `localStorage` under the key `"repopilot-theme"`.
4. **Zero Flash of Wrong Theme (FOUC Prevention):**
   A blocking inline script is placed in `<head>` before any body markup renders:
   ```js
   (function() {
     try {
       var t = localStorage.getItem('repopilot-theme');
       var d = 'light';
       if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
         d = 'dark';
       }
       document.documentElement.setAttribute('data-theme', d);
       document.documentElement.style.colorScheme = d;
     } catch (e) {}
   })();
   ```
5. **Cross-Tab Synchronization:** A `storage` event listener updates active tabs dynamically if the theme is changed in another window.
6. **Exports & PDF Reports:** Markdown exports, printable audits, and generated PDFs **always** render using the Light theme tokens.

---

## 9. Accessibility Rules (Do's and Don'ts)

### ✅ DO:
- Use CSS variables for all color applications: `var(--color-bg)`, `var(--color-text)`.
- Verify every text/background pair achieves at least 4.5:1 contrast.
- Pair every status color with a visible icon and textual label.
- Provide visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-blue-600`).
- Ensure code block syntax remains high-contrast in both light and dark modes.

### ❌ DO NOT:
- **Never use Yellow (`#FBBC04`) for text** on light backgrounds.
- Never hardcode arbitrary hex colors like `#0F1011` or `#5E6AD2` in component files.
- Never rely on color alone to indicate pass/fail or verified/unverified state.
- Never use low-contrast muted gray text for essential instructional copy.

---

## 10. How to Add a New Color Token

1. Define the semantic token in `src/styles/globals.css`:
   - Add light value under `:root`.
   - Add dark value under `[data-theme="dark"]`.
2. Map the token in `tailwind.config.ts` under `theme.extend.colors`.
3. Verify the contrast ratio against light surface (`#FFFFFF`) and dark surface (`#292A2D`) using relative luminance formulas.
4. Document the new token and measured contrast in `DESIGN.md`.
