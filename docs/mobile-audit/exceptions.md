# Mobile Touch Target Exceptions

**Document Version:** 1.0.0  
**WCAG 2.1 Success Criterion 2.5.5:** Target Size (Enhanced) / 2.5.8 Target Size (Minimum)  
**Verification Scope:** Interactive Elements Across All Routes  

---

## Allowed Exceptions & Technical Rationales

| Element Type | Location | Computed Dimensions | Rationale |
| :--- | :--- | :--- | :--- |
| **Code Viewer Line Numbers** | `/explore`, `CodeViewer.tsx` | 32×20 px | Line numbers are auxiliary indicators intended for reading code. Clicking a line number to copy line anchor is a supplementary developer shortcut, not a primary CTA. Expanding to 44px would artificially triple code block height. |
| **Breadcrumb Chevron Separators** | Shell Header & Explorer Breadcrumb | 12×12 px | Non-interactive visual separators between path segments. |
| **Inline Code References** | `/docs`, Assistant answer copy | Fluid text height | Standard inline text links wrapped in paragraph flow (`WCAG 2.5.5 Inline Exception`). |
| **File Tree Indentation Spacers** | `/explore`, `FileTree.tsx` | 14px indentation guide | Visual tree hierarchy spacers; the parent row container provides the full `>= 44px` touch hit area. |
| **Footer External Attribution Links** | Landing page footer, modal credits | 24px height | Informational secondary links placed in loose footer layout with `> 16px` surrounding spacing. |

