import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, ZoomIn, ZoomOut } from "lucide-react";

export interface CodeViewerProps {
  code: string;
  filePath?: string;
  language?: string;
  highlightLines?: [number, number];
  onLineClick?: (line: number) => void;
  maxHeight?: string;
}

const TOKEN_REGEX =
  /(\/\/[^\n]*|\/\*.*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:import|export|from|const|let|var|function|return|if|else|switch|case|break|continue|default|for|while|do|try|catch|finally|throw|new|typeof|instanceof|async|await|yield|class|extends|interface|type|enum|implements|public|private|protected|readonly|static|as|is|in|of|def|elif|except|raise|with|lambda|pass|assert|func|package|struct|map|chan|go|defer|select|range|fn|mut|pub|use|mod|trait|impl|match|loop|crate|where)\b)|(\b(?:true|false|null|undefined|nil|None|True|False)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|([a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;

function renderHighlightedTokens(line: string): React.ReactNode {
  if (!line) return " ";

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(line)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];

    if (matchIndex > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-theme-code-text">
          {line.substring(lastIndex, matchIndex)}
        </span>
      );
    }

    if (match[1]) {
      // Comment
      elements.push(
        <span key={`comm-${matchIndex}`} className="text-theme-code-comment italic">
          {matchText}
        </span>
      );
    } else if (match[2]) {
      // String
      elements.push(
        <span key={`str-${matchIndex}`} className="text-theme-green">
          {matchText}
        </span>
      );
    } else if (match[3]) {
      // Keyword
      elements.push(
        <span key={`kw-${matchIndex}`} className="text-theme-purple font-medium">
          {matchText}
        </span>
      );
    } else if (match[4]) {
      // Boolean / Null
      elements.push(
        <span key={`bool-${matchIndex}`} className="text-theme-yellow font-medium">
          {matchText}
        </span>
      );
    } else if (match[5]) {
      // Number
      elements.push(
        <span key={`num-${matchIndex}`} className="text-theme-yellow">
          {matchText}
        </span>
      );
    } else if (match[6]) {
      // Type / Class
      elements.push(
        <span key={`type-${matchIndex}`} className="text-theme-blue font-medium">
          {matchText}
        </span>
      );
    } else if (match[7]) {
      // Function call
      elements.push(
        <span key={`fn-${matchIndex}`} className="text-theme-blue">
          {matchText}
        </span>
      );
    }

    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < line.length) {
    elements.push(
      <span key={`text-${lastIndex}`} className="text-theme-code-text">
        {line.substring(lastIndex)}
      </span>
    );
  }

  return elements;
}

const FONT_SIZES = [
  { label: "11px", codeClass: "text-[11px]", lineNumClass: "text-[10px]" },
  { label: "12px", codeClass: "text-xs", lineNumClass: "text-[11px]" },
  { label: "14px", codeClass: "text-sm", lineNumClass: "text-xs" },
  { label: "16px", codeClass: "text-base", lineNumClass: "text-sm" }
];

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  filePath,
  language,
  highlightLines,
  onLineClick,
  maxHeight = "500px"
}) => {
  const [copied, setCopied] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // Default to 12px (text-xs)
  const [flashHighlight, setFlashHighlight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = code ? code.split("\n") : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHighlighted = (lineNum: number) => {
    if (!highlightLines) return false;
    return lineNum >= highlightLines[0] && lineNum <= highlightLines[1];
  };

  // Scroll citation jumps smoothly into view and flash highlight
  useEffect(() => {
    if (!highlightLines || !highlightLines[0]) return;
    const targetLine = highlightLines[0];
    const el = document.getElementById(`L${targetLine}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashHighlight(true);
      const timer = setTimeout(() => setFlashHighlight(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [highlightLines, code]);

  const decreaseFontSize = () => {
    setFontSizeIndex((prev) => Math.max(0, prev - 1));
  };

  const increaseFontSize = () => {
    setFontSizeIndex((prev) => Math.min(FONT_SIZES.length - 1, prev + 1));
  };

  const currentFont = FONT_SIZES[fontSizeIndex];

  return (
    <div className="w-full bg-theme-code-bg border border-theme-border rounded-xl overflow-hidden font-mono shadow-md">
      {/* File header bar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-theme-surface-alt border-b border-theme-border text-theme-text-muted gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 truncate">
          <span className="font-medium text-theme-text truncate text-xs">
            {filePath || "Code Snippet"}
          </span>
          {language && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-theme-surface border border-theme-border text-theme-text-muted">
              {language}
            </span>
          )}
          <span className="text-theme-text-muted text-[11px] hidden sm:inline">
            {lines.length} lines
          </span>
        </div>

        {/* Action controls: Font Size Zoom + Copy */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Adjustable Font Size Control */}
          <div className="flex items-center gap-1 bg-theme-surface border border-theme-border rounded-md px-1.5 py-0.5 text-xs">
            <button
              type="button"
              onClick={decreaseFontSize}
              disabled={fontSizeIndex === 0}
              aria-label="Decrease font size"
              title="Decrease font size"
              className="flex items-center justify-center w-6 h-6 rounded text-theme-text-muted hover:text-theme-text disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-theme-text-muted select-none w-7 text-center">
              {currentFont.label}
            </span>
            <button
              type="button"
              onClick={increaseFontSize}
              disabled={fontSizeIndex === FONT_SIZES.length - 1}
              aria-label="Increase font size"
              title="Increase font size"
              className="flex items-center justify-center w-6 h-6 rounded text-theme-text-muted hover:text-theme-text disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-theme-text-muted hover:text-theme-text px-2.5 py-1 min-h-[36px] sm:min-h-0 rounded-md hover:bg-theme-surface transition-colors cursor-pointer"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-theme-green" />
                <span className="text-theme-green font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code viewport with sticky line numbers and horizontal scrolling */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-auto divide-y divide-transparent select-text code-scroll-container"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse min-w-max">
          <tbody>
            {lines.map((lineContent: string, idx: number) => {
              const lineNum = idx + 1;
              const highlighted = isHighlighted(lineNum);
              return (
                <tr
                  key={lineNum}
                  id={`L${lineNum}`}
                  onClick={() => onLineClick?.(lineNum)}
                  className={`group transition-colors ${
                    highlighted
                      ? flashHighlight
                        ? "bg-theme-blue/30 border-l-3 border-theme-blue"
                        : "bg-theme-blue/15 border-l-2 border-theme-blue"
                      : "hover:bg-theme-surface-alt/40 border-l-2 border-transparent"
                  }`}
                >
                  {/* Sticky Line Number Column */}
                  <td
                    className={`sticky left-0 bg-theme-code-bg z-10 w-12 py-0.5 pr-3 pl-3 text-right select-none text-theme-text-muted group-hover:text-theme-text ${currentFont.lineNumClass} align-top font-mono border-r border-theme-border/20`}
                  >
                    {lineNum}
                  </td>
                  {/* Code Line Content with horizontal scroll safety */}
                  <td
                    className={`py-0.5 pr-4 pl-3 whitespace-pre font-mono leading-relaxed ${currentFont.codeClass}`}
                  >
                    {renderHighlightedTokens(lineContent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
