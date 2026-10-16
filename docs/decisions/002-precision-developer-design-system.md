# ADR 002: Precision Developer Tool Design System

## Status
Accepted

## Context
Developer productivity tools often fall into two visual failure modes:
1. Bloated AI dashboard templates with excessive neon gradients, meaningless statistics, decorative floating blobs, and low technical utility.
2. Unstyled bare-bones prototypes lacking visual hierarchy, state indicators, and keyboard accessibility.

RepoPilot requires a cohesive, premium developer design language that prioritizes high information density, clear surface hierarchy, and technical clarity.

## Decision
1. **Surface & Depth Hierarchy**:
   - Deep obsidian canvas (`#010102`) as the base layer.
   - Stepped surface hierarchy (`#0F1011` Surface 1, `#141516` Surface 2, `#18191A` Surface 3, `#191A1B` Surface 4) to establish visual depth through elevation rather than heavy drop shadows.
   - 1-pixel crisp borders (`#23252A` subtle dividers, `#34343A` component borders, `#3E3E44` interactive hover borders).

2. **Color Restraint**:
   - Single primary accent: Restrained lavender-blue (`#5E6AD2`, hover `#828FFF`, active `#4D58B4`) reserved for primary actions, active navigation items, and focus indicators.
   - Semantic tokens: Functional green (`#27A644` success), amber (`#F59E0B` warning), and red (`#EF4444` error / bug) applied exclusively to express real system states.

3. **Typography & Technical Density**:
   - Interface text: Clean sans-serif hierarchy (56px display down to 12px captions) with tight letter spacing for large headers and legible line heights for technical descriptions.
   - Technical identifiers: Monospace typography for commit SHAs, line numbers, file paths, and symbol signatures.

4. **Zero-Fabricated-Data Policy**:
   - No synthetic repositories, fake stars, invented quality scores, or artificial metrics.
   - Workspaces without an imported repository display honest empty states that guide the user to import a real public GitHub repository.

## Consequences
- Fast client-side rendering with zero heavy animation dependencies.
- Clear visual hierarchy that improves source code comprehension.
- Consistent, predictable interaction patterns across every screen.
