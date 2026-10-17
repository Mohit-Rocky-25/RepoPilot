import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";

export interface ParsedCitation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  isValid: boolean;
  reason?: string;
}

export interface CitationValidationResult {
  validCitations: ParsedCitation[];
  invalidCitations: ParsedCitation[];
  cleanedText: string;
  warning?: string;
}

export class CitationValidator {
  /**
   * Extracts citations in formats:
   * - [path/to/file:10-25]
   * - [path/to/file:10]
   * - [path/to/file:10-25#symbolName]
   */
  static extractCitations(
    text: string
  ): { filePath: string; startLine: number; endLine: number; symbolName?: string; rawTag: string }[] {
    const citations: {
      filePath: string;
      startLine: number;
      endLine: number;
      symbolName?: string;
      rawTag: string;
    }[] = [];
    const regex = /\[([a-zA-Z0-9_\-./]+):(\d+)(?:-(\d+))?(?:#([a-zA-Z0-9_$]+))?\]/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const filePath = match[1];
      const startLine = parseInt(match[2], 10);
      const endLine = match[3] ? parseInt(match[3], 10) : startLine;
      const symbolName = match[4] || undefined;

      citations.push({
        filePath,
        startLine,
        endLine,
        symbolName,
        rawTag: match[0]
      });
    }

    return citations;
  }

  /**
   * Strictly validates citations against pinned files and optional indexed symbols.
   * A citation is kept only if:
   * 1. The file exists at the pinned commit
   * 2. The line range is valid (startLine >= 1, endLine >= startLine, within file lineCount if known)
   * 3. Any named symbol actually appears within or in the enclosing symbol of that range
   */
  static validate(
    extracted: { filePath: string; startLine: number; endLine: number; symbolName?: string; rawTag?: string }[],
    validFiles: RepositoryFile[],
    symbols?: IndexedSymbol[],
    fileContents?: Map<string, string>
  ): CitationValidationResult {
    const fileMap = new Map<string, RepositoryFile>();
    for (const f of validFiles) {
      fileMap.set(f.path, f);
    }

    const validCitations: ParsedCitation[] = [];
    const invalidCitations: ParsedCitation[] = [];

    for (const cit of extracted) {
      const file = fileMap.get(cit.filePath);
      if (!file) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          reason: `File "${cit.filePath}" does not exist in the pinned repository revision.`
        });
        continue;
      }

      if (cit.startLine < 1 || cit.endLine < cit.startLine) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          reason: `Invalid line range ${cit.startLine}-${cit.endLine}.`
        });
        continue;
      }

      // Check against known file lineCount or content lines
      let maxLines: number | undefined = file.lineCount;
      if (!maxLines && fileContents && fileContents.has(cit.filePath)) {
        maxLines = fileContents.get(cit.filePath)!.split("\n").length;
      }

      if (maxLines && (cit.startLine > maxLines || cit.endLine > maxLines)) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          reason: `Line range ${cit.startLine}-${cit.endLine} exceeds file length (${maxLines} lines).`
        });
        continue;
      }

      // Check symbol presence if a symbol was named in the citation
      if (cit.symbolName && symbols && symbols.length > 0) {
        const fileSymbols = symbols.filter((s) => s.filePath === cit.filePath);
        const matchingSymbol = fileSymbols.find((s) => s.name === cit.symbolName);

        if (!matchingSymbol) {
          invalidCitations.push({
            ...cit,
            isValid: false,
            reason: `Symbol "${cit.symbolName}" does not exist in file "${cit.filePath}".`
          });
          continue;
        }

        // Check if citation line range overlaps with the symbol's startLine-endLine
        const overlaps =
          cit.startLine <= matchingSymbol.endLine &&
          cit.endLine >= matchingSymbol.startLine;

        if (!overlaps) {
          invalidCitations.push({
            ...cit,
            isValid: false,
            reason: `Symbol "${cit.symbolName}" (lines ${matchingSymbol.startLine}-${matchingSymbol.endLine}) does not overlap with citation range ${cit.startLine}-${cit.endLine}.`
          });
          continue;
        }
      }

      validCitations.push({
        ...cit,
        isValid: true
      });
    }

    return {
      validCitations,
      invalidCitations,
      cleanedText: "",
      warning:
        invalidCitations.length > 0
          ? "Some citations could not be verified and were removed."
          : undefined
    };
  }

  /**
   * Cleans text by removing invalid citation tags
   */
  static cleanInvalidCitations(text: string, invalidCitations: ParsedCitation[]): string {
    let cleaned = text;
    for (const inv of invalidCitations) {
      const tagPattern = new RegExp(
        `\\[${inv.filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:${inv.startLine}(?:-${inv.endLine})?(?:#[^\\]]+)?\\]`,
        "g"
      );
      cleaned = cleaned.replace(tagPattern, "");
    }
    return cleaned;
  }
}
