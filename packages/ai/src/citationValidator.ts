import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";

export type CitationSupportStatus = "verified" | "weak" | "unverified";

export interface ParsedCitation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  isValid: boolean;
  supportStatus?: CitationSupportStatus;
  isWeakSupport?: boolean;
  reason?: string;
  rawTag?: string;
  claimSentence?: string;
  matchedTerms?: string[];
}

export interface UncitedClaim {
  sentence: string;
  mentionedEntities: string[];
  reason: string;
}

export interface CitationValidationResult {
  validCitations: ParsedCitation[];
  weakCitations: ParsedCitation[];
  invalidCitations: ParsedCitation[];
  uncitedClaims: UncitedClaim[];
  cleanedText: string;
  warning?: string;
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
  "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
  "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
  "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

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
   * Detects uncited factual sentences in an answer that mention file paths or symbols.
   */
  static detectUncitedClaims(
    text: string,
    validFiles: RepositoryFile[],
    symbols?: IndexedSymbol[]
  ): UncitedClaim[] {
    if (!text || typeof text !== "string") return [];

    const validPaths = new Set(validFiles.map((f) => f.path.toLowerCase()));
    const symbolNames = new Map<string, string>();
    if (symbols) {
      for (const s of symbols) {
        if (s.name.length >= 4) {
          symbolNames.set(s.name.toLowerCase(), s.name);
        }
      }
    }

    const sentences = text
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const uncited: UncitedClaim[] = [];

    for (const sentence of sentences) {
      // If sentence contains a citation tag, it is cited
      if (/\[[a-zA-Z0-9_\-./]+:\d+(?:-\d+)?(?:#[a-zA-Z0-9_$]+)?\]/.test(sentence)) {
        continue;
      }

      const mentioned: string[] = [];
      const lower = sentence.toLowerCase();

      // Check known file paths
      for (const p of validPaths) {
        if (lower.includes(p)) {
          mentioned.push(p);
        }
      }

      // Check path-like patterns (e.g. src/auth/jwt.ts)
      const pathRegex = /\b(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+\b/g;
      let pathMatch;
      while ((pathMatch = pathRegex.exec(sentence)) !== null) {
        if (!mentioned.includes(pathMatch[0])) {
          mentioned.push(pathMatch[0]);
        }
      }

      // Check symbol identifiers
      for (const [lowerSym, origSym] of symbolNames.entries()) {
        const wordRegex = new RegExp(`\\b${lowerSym}\\b`, "i");
        if (wordRegex.test(sentence) && !mentioned.includes(origSym)) {
          mentioned.push(origSym);
        }
      }

      if (mentioned.length > 0) {
        uncited.push({
          sentence,
          mentionedEntities: mentioned,
          reason: `Sentence mentions ${mentioned.join(", ")} without a citation.`
        });
      }
    }

    return uncited;
  }

  /**
   * Three-Pass Citation Validation:
   * Pass 1: File exists at the pinned commit SHA.
   * Pass 2: Line bounds are valid and the cited span contains non-whitespace code.
   * Pass 3: Support Check: Cited span must contain at least one symbol or key term mentioned
   *         in the claim sentence it supports. If not, tagged "Weak support" (not stripped, visibly flagged).
   */
  static validate(
    extracted: { filePath: string; startLine: number; endLine: number; symbolName?: string; rawTag?: string }[],
    validFiles: RepositoryFile[],
    symbols?: IndexedSymbol[],
    fileContents?: Map<string, string>,
    answerText?: string
  ): CitationValidationResult {
    const fileMap = new Map<string, RepositoryFile>();
    for (const f of validFiles) {
      fileMap.set(f.path, f);
    }

    const validCitations: ParsedCitation[] = [];
    const weakCitations: ParsedCitation[] = [];
    const invalidCitations: ParsedCitation[] = [];

    // Pre-split sentences if answerText is provided for Pass 3 support check
    const sentences = answerText ? answerText.split(/(?<=[.!?\n])\s+/) : [];

    for (const cit of extracted) {
      const rawTag = cit.rawTag || `[${cit.filePath}:${cit.startLine}${cit.endLine !== cit.startLine ? `-${cit.endLine}` : ""}]`;

      // ----------------------------------------------------
      // PASS 1: File existence check in pinned revision
      // ----------------------------------------------------
      const file = fileMap.get(cit.filePath);
      if (!file) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          supportStatus: "unverified",
          rawTag,
          reason: `File "${cit.filePath}" does not exist in the pinned repository revision.`
        });
        continue;
      }

      // ----------------------------------------------------
      // PASS 2: Line bounds and non-whitespace code check
      // ----------------------------------------------------
      if (cit.startLine < 1 || cit.endLine < cit.startLine) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          supportStatus: "unverified",
          rawTag,
          reason: `Invalid line range ${cit.startLine}-${cit.endLine}.`
        });
        continue;
      }

      let maxLines: number | undefined = file.lineCount;
      let content = fileContents?.get(cit.filePath);
      if (!maxLines && content) {
        maxLines = content.split("\n").length;
      }

      if (maxLines && (cit.startLine > maxLines || cit.endLine > maxLines)) {
        invalidCitations.push({
          ...cit,
          isValid: false,
          supportStatus: "unverified",
          rawTag,
          reason: `Line range ${cit.startLine}-${cit.endLine} exceeds file length (${maxLines} lines).`
        });
        continue;
      }

      // Check that span has non-whitespace code
      if (content) {
        const fileLines = content.split("\n");
        const spanLines = fileLines.slice(cit.startLine - 1, cit.endLine);
        const spanText = spanLines.join("").trim();
        if (spanText.length === 0) {
          invalidCitations.push({
            ...cit,
            isValid: false,
            supportStatus: "unverified",
            rawTag,
            reason: `Line range ${cit.startLine}-${cit.endLine} contains only empty or whitespace lines.`
          });
          continue;
        }
      }

      // Symbol presence and overlap check
      if (cit.symbolName && symbols && symbols.length > 0) {
        const fileSymbols = symbols.filter((s) => s.filePath === cit.filePath);
        const matchingSymbol = fileSymbols.find((s) => s.name === cit.symbolName);

        if (!matchingSymbol) {
          invalidCitations.push({
            ...cit,
            isValid: false,
            supportStatus: "unverified",
            rawTag,
            reason: `Symbol "${cit.symbolName}" does not exist in file "${cit.filePath}".`
          });
          continue;
        }

        const overlaps =
          cit.startLine <= matchingSymbol.endLine &&
          cit.endLine >= matchingSymbol.startLine;

        if (!overlaps) {
          invalidCitations.push({
            ...cit,
            isValid: false,
            supportStatus: "unverified",
            rawTag,
            reason: `Symbol "${cit.symbolName}" (lines ${matchingSymbol.startLine}-${matchingSymbol.endLine}) does not overlap with citation range ${cit.startLine}-${cit.endLine}.`
          });
          continue;
        }
      }

      // ----------------------------------------------------
      // PASS 3: Support Check (Relevance to claim sentence)
      // ----------------------------------------------------
      let isWeak = false;
      let matchedTerms: string[] = [];

      if (content && answerText) {
        // Find claim sentence containing this citation
        const claimSentence =
          sentences.find(
            (s) =>
              s.includes(rawTag) ||
              (s.includes(cit.filePath) && s.includes(String(cit.startLine)))
          ) || "";

        const cleanSentence = claimSentence
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/[^\w\s]/g, " ");

        const claimWords = cleanSentence
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

        const fileLines = content.split("\n");
        const spanCode = fileLines
          .slice(cit.startLine - 1, cit.endLine)
          .join("\n")
          .toLowerCase();

        matchedTerms = claimWords.filter((w) => spanCode.includes(w));
        const hasSymbolMatch = cit.symbolName
          ? spanCode.includes(cit.symbolName.toLowerCase())
          : false;

        // If the claim sentence has substantive terms, the cited span must contain at least one
        if (claimWords.length > 0 && matchedTerms.length === 0 && !hasSymbolMatch) {
          isWeak = true;
        }
      }

      if (isWeak) {
        const weakCit: ParsedCitation = {
          ...cit,
          isValid: true,
          supportStatus: "weak",
          isWeakSupport: true,
          rawTag,
          reason: "Cited span does not contain key terms or symbols from the claim sentence."
        };
        validCitations.push(weakCit);
        weakCitations.push(weakCit);
      } else {
        validCitations.push({
          ...cit,
          isValid: true,
          supportStatus: "verified",
          isWeakSupport: false,
          rawTag,
          matchedTerms
        });
      }
    }

    const uncitedClaims = answerText
      ? this.detectUncitedClaims(answerText, validFiles, symbols)
      : [];

    let warning: string | undefined;
    if (invalidCitations.length > 0) {
      warning = "Some citations could not be verified and were removed.";
    } else if (weakCitations.length > 0) {
      warning = `${weakCitations.length} citation(s) have weak support; verify relevance.`;
    }

    return {
      validCitations,
      weakCitations,
      invalidCitations,
      uncitedClaims,
      cleanedText: "",
      warning
    };
  }

  /**
   * Cleans text by removing invalid citation tags (preserves valid and weak-support citations).
   */
  static cleanInvalidCitations(
    text: string,
    invalidCitations: { filePath: string; startLine: number; endLine?: number }[]
  ): string {
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
