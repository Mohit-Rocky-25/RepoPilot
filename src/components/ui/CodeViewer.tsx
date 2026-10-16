import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeViewerProps {
  code: string;
  filePath?: string;
  language?: string;
  highlightLines?: [number, number]; // [startLine, endLine]
  onLineClick?: (lineNumber: number) => void;
  maxHeight?: string;
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
    <div className="w-full bg-[#0F1011] border border-[#23252A] rounded-xl overflow-hidden font-mono text-xs shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
      {/* File header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#141516] border-b border-[#23252A] text-[#8A8F98]">
        <div className="flex items-center gap-2.5 truncate">
          <span className="font-medium text-[#F7F8F8] truncate text-xs">
            {filePath || "Code Snippet"}
          </span>
          {language && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#18191A] border border-[#34343A] text-[#8A8F98]">
              {language}
            </span>
          )}
          <span className="text-[#62666D] text-[11px]">
            {lines.length} lines
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-[#8A8F98] hover:text-[#F7F8F8] px-2 py-1 rounded-md hover:bg-[#18191A] transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#27A644]" />
              <span className="text-[#27A644] font-medium">Copied</span>
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
            {lines.map((lineContent, idx) => {
              const lineNum = idx + 1;
              const highlighted = isHighlighted(lineNum);
              return (
                <tr
                  key={lineNum}
                  id={`L${lineNum}`}
                  onClick={() => onLineClick?.(lineNum)}
                  className={`group transition-colors ${
                    highlighted
                      ? "bg-[#5E6AD2]/15 border-l-2 border-[#5E6AD2]"
                      : "hover:bg-[#141516]/60 border-l-2 border-transparent"
                  }`}
                >
                  <td className="w-12 py-0.5 pr-3 pl-3 text-right select-none text-[#62666D] group-hover:text-[#8A8F98] text-[11px] align-top font-mono">
                    {lineNum}
                  </td>
                  <td className="py-0.5 pr-4 pl-1 text-[#D0D6E0] whitespace-pre font-mono leading-relaxed text-xs">
                    {lineContent || " "}
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
