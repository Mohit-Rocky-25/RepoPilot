import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

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
        <span key={`text-${lastIndex}`} className="text-[#E8EAED]">
          {line.substring(lastIndex, matchIndex)}
        </span>
      );
    }

    if (match[1]) {
      // Comment
      elements.push(
        <span key={`comm-${matchIndex}`} className="text-[#9AA0A6] italic">
          {matchText}
        </span>
      );
    } else if (match[2]) {
      // String
      elements.push(
        <span key={`str-${matchIndex}`} className="text-[#81C995]">
          {matchText}
        </span>
      );
    } else if (match[3]) {
      // Keyword
      elements.push(
        <span key={`kw-${matchIndex}`} className="text-[#C58AF9] font-medium">
          {matchText}
        </span>
      );
    } else if (match[4]) {
      // Boolean / Null
      elements.push(
        <span key={`bool-${matchIndex}`} className="text-[#FDD663]">
          {matchText}
        </span>
      );
    } else if (match[5]) {
      // Number
      elements.push(
        <span key={`num-${matchIndex}`} className="text-[#FDD663]">
          {matchText}
        </span>
      );
    } else if (match[6]) {
      // Type / Class
      elements.push(
        <span key={`type-${matchIndex}`} className="text-[#8AB4F8]">
          {matchText}
        </span>
      );
    } else if (match[7]) {
      // Function call
      elements.push(
        <span key={`fn-${matchIndex}`} className="text-[#AECBFA]">
          {matchText}
        </span>
      );
    }

    lastIndex = TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < line.length) {
    elements.push(
      <span key={`text-${lastIndex}`} className="text-[#E8EAED]">
        {line.substring(lastIndex)}
      </span>
    );
  }

  return elements;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  filePath,
  language,
  highlightLines,
  onLineClick,
  maxHeight = "500px"
}) => {
  const [copied, setCopied] = useState(false);
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

  return (
    <div className="w-full bg-[#202124] border border-theme-border rounded-xl overflow-hidden font-mono text-xs shadow-md">
      {/* File header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#171717] border-b border-white/10 text-[#9AA0A6]">
        <div className="flex items-center gap-2.5 truncate">
          <span className="font-medium text-[#E8EAED] truncate text-xs">
            {filePath || "Code Snippet"}
          </span>
          {language && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-white/10 border border-white/15 text-[#E8EAED]">
              {language}
            </span>
          )}
          <span className="text-[#9AA0A6] text-[11px]">
            {lines.length} lines
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-[#9AA0A6] hover:text-[#E8EAED] px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#81C995]" />
              <span className="text-[#81C995] font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code viewport with line numbers */}
      <div
        className="overflow-auto divide-y divide-transparent select-text"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
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
                      ? "bg-[#1A73E8]/25 border-l-2 border-[#8AB4F8]"
                      : "hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                >
                  <td className="w-12 py-0.5 pr-3 pl-3 text-right select-none text-[#5F6368] group-hover:text-[#9AA0A6] text-[11px] align-top font-mono">
                    {lineNum}
                  </td>
                  <td className="py-0.5 pr-4 pl-1 whitespace-pre font-mono leading-relaxed text-xs">
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
