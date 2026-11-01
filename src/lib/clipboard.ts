/**
 * Robust cross-browser clipboard copy utility with fallback.
 * Uses Clipboard API where supported and falls back to select-and-copy with temporary textarea.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1. Primary: Modern Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback textarea strategy
    }
  }

  // 2. Fallback: Hidden textarea with document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Prevent zoom/scroll on mobile
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

