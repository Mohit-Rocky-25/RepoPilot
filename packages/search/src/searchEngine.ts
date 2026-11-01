import type {
  RepositoryFile,
  IndexedSymbol,
  SearchQuery,
  SearchResult
} from "@repopilot/core";

export interface SearchCorpus {
  files: RepositoryFile[];
  symbols: IndexedSymbol[];
  fileContents?: Map<string, string>;
}

export interface ContextRetrievalOptions {
  query: string;
  targetFilePath?: string;
  maxTokens?: number; // default 4000 tokens
}

export interface ContextRetrievalResult {
  hasRelevantMatches: boolean;
  rankedFiles: { filePath: string; score: number; reasons: string[] }[];
  includedFiles: string[];
  omittedFiles: string[];
  omittedCount: number;
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

/**
 * Splits identifiers across camelCase, PascalCase, snake_case, kebab-case, and digits.
 * E.g. "handleAuthCallback" -> ["handleauthcallback", "handle", "auth", "callback"]
 */
export function splitIdentifier(identifier: string): string[] {
  if (!identifier || typeof identifier !== "string") return [];
  const cleaned = identifier.trim();
  if (!cleaned) return [];
  const lowerOrig = cleaned.toLowerCase();

  // Split on camelCase/PascalCase boundaries, underscores, hyphens, dots, and digits
  const parts = cleaned
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((p) => p.toLowerCase().trim())
    .filter((p) => p.length > 0);

  const tokenSet = new Set<string>();
  if (lowerOrig) tokenSet.add(lowerOrig);
  const noSep = lowerOrig.replace(/[-_.]+/g, "");
  if (noSep) tokenSet.add(noSep);

  for (const part of parts) {
    tokenSet.add(part);
  }

  return Array.from(tokenSet);
}

export class SearchEngine {
  constructor(private corpus: SearchCorpus) {}

  search(queryObj: {
    query: string;
    type?: "all" | "symbol" | "path" | "text";
    pathPrefix?: string;
    language?: string;
    caseSensitive?: boolean;
    limit?: number;
  }): SearchResult[] {
    const { query, type = "all", pathPrefix, language, caseSensitive = false, limit = 30 } =
      queryObj;
    const q = caseSensitive ? query : query.toLowerCase();
    const trimmed = q.trim();
    if (!trimmed) return [];

    const queryTerms = trimmed
      .split(/[\s_.-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !STOP_WORDS.has(t));

    const results: SearchResult[] = [];

    // Filter files based on pathPrefix and language
    const eligibleFiles = this.corpus.files.filter((file) => {
      if (pathPrefix && !file.path.startsWith(pathPrefix)) return false;
      if (language && file.language?.toLowerCase() !== language.toLowerCase()) return false;
      return true;
    });

    const eligibleFilePaths = new Set(eligibleFiles.map((f) => f.path));

    // 1. Search File Paths
    if (type === "all" || type === "path") {
      for (const file of eligibleFiles) {
        const target = caseSensitive ? file.path : file.path.toLowerCase();
        const fileName = target.split("/").pop() || "";
        const pathTokens = splitIdentifier(fileName);

        if (target.endsWith("/" + trimmed) || target === trimmed) {
          results.push({
            filePath: file.path,
            lineNumber: 1,
            matchType: "path",
            previewText: file.path,
            score: 100
          });
        } else if (target.includes(trimmed)) {
          results.push({
            filePath: file.path,
            lineNumber: 1,
            matchType: "path",
            previewText: file.path,
            score: 75
          });
        } else if (queryTerms.length > 0) {
          const matched = queryTerms.filter(
            (t) => pathTokens.includes(t) || target.includes(t)
          ).length;
          if (matched > 0) {
            const allMatched = matched === queryTerms.length;
            results.push({
              filePath: file.path,
              lineNumber: 1,
              matchType: "path",
              previewText: file.path,
              score: allMatched ? 65 : 40 + matched * 5
            });
          }
        }
      }
    }

    // 2. Search Symbols (with token splitting and multi-term ranking)
    if (type === "all" || type === "symbol") {
      for (const sym of this.corpus.symbols) {
        if (!eligibleFilePaths.has(sym.filePath)) continue;

        const name = caseSensitive ? sym.name : sym.name.toLowerCase();
        const symTokens = splitIdentifier(sym.name);

        // Exact symbol name match (3.0x symbol boost equivalence: 100)
        if (name === trimmed) {
          results.push({
            filePath: sym.filePath,
            lineNumber: sym.startLine,
            matchType: "symbol",
            previewText: sym.signature || `${sym.kind} ${sym.name}`,
            symbolKind: sym.kind,
            score: 100
          });
          continue;
        }

        // Substring match of full query in symbol name
        if (name.includes(trimmed)) {
          results.push({
            filePath: sym.filePath,
            lineNumber: sym.startLine,
            matchType: "symbol",
            previewText: sym.signature || `${sym.kind} ${sym.name}`,
            symbolKind: sym.kind,
            score: 85
          });
          continue;
        }

        // Multi-term / Token-split matching
        if (queryTerms.length > 0) {
          let matchedCount = 0;
          let exactTokenMatches = 0;

          for (const term of queryTerms) {
            if (symTokens.includes(term)) {
              matchedCount++;
              exactTokenMatches++;
            } else if (symTokens.some((t) => t.includes(term))) {
              matchedCount++;
            }
          }

          if (matchedCount > 0) {
            const allMatched = matchedCount === queryTerms.length;
            // Rank symbols higher when ALL query terms match split tokens (e.g. auth + callback in handleAuthCallback)
            const score = allMatched
              ? 80 + exactTokenMatches * 5
              : 45 + matchedCount * 10;

            results.push({
              filePath: sym.filePath,
              lineNumber: sym.startLine,
              matchType: "symbol",
              previewText: sym.signature || `${sym.kind} ${sym.name}`,
              symbolKind: sym.kind,
              score
            });
          }
        }
      }
    }

    // 3. Search Raw Text in fileContents (if available)
    if ((type === "all" || type === "text") && this.corpus.fileContents) {
      for (const [filePath, content] of this.corpus.fileContents.entries()) {
        if (!eligibleFilePaths.has(filePath)) continue;

        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          const targetLine = caseSensitive ? line : line.toLowerCase();
          if (targetLine.includes(trimmed)) {
            const previewText = line.trim();
            results.push({
              filePath,
              lineNumber: idx + 1,
              matchType: "exact",
              previewText,
              score: 60
            });
          }
        });
      }
    }

    // Sort by descending score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * BM25-style lexical context retrieval with multi-factor boosts:
   * - Symbol matches (3.0x boost for exact matches, token-split match bonuses)
   * - Path / filename matches (token-split and exact)
   * - Entry points (index/main/app) (1.5x multiplier)
   * - Manifest files (package.json, Cargo.toml, go.mod) (1.3x multiplier)
   * Shows included files and omitted count under configurable token bounds.
   */
  retrieveContext(options: ContextRetrievalOptions): ContextRetrievalResult {
    const { query, targetFilePath, maxTokens = 4000 } = options;

    const rawTerms = query
      .toLowerCase()
      .replace(/[^\w\s/.-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

    // Tokenize terms further to support compound identifiers
    const terms = Array.from(new Set(rawTerms.flatMap((t) => splitIdentifier(t))));

    const scoredFiles: { filePath: string; score: number; reasons: string[] }[] = [];

    // Map symbols by file
    const symbolsByFile = new Map<string, IndexedSymbol[]>();
    for (const sym of this.corpus.symbols) {
      const list = symbolsByFile.get(sym.filePath) || [];
      list.push(sym);
      symbolsByFile.set(sym.filePath, list);
    }

    for (const file of this.corpus.files) {
      if (file.isBinary) continue;

      let score = 0;
      const reasons: string[] = [];
      const lowerPath = file.path.toLowerCase();
      const fileName = lowerPath.split("/").pop() || "";

      // 1. Direct Target File boost
      if (targetFilePath && file.path === targetFilePath) {
        score += 200;
        reasons.push("Explicit target file");
      }

      // 2. Lexical term matches against path
      const pathTokens = splitIdentifier(fileName);
      for (const term of terms) {
        if (fileName === term) {
          score += 60;
          reasons.push(`Exact filename match for "${term}"`);
        } else if (pathTokens.includes(term)) {
          score += 35;
          reasons.push(`Filename token match for "${term}"`);
        } else if (fileName.includes(term)) {
          score += 30;
          reasons.push(`Partial filename match for "${term}"`);
        } else if (lowerPath.includes(term)) {
          score += 15;
          reasons.push(`Path directory match for "${term}"`);
        }
      }

      // 3. Symbol matches boost (3.0x exact symbol boost + token split matching)
      const fileSymbols = symbolsByFile.get(file.path);
      if (fileSymbols) {
        for (const sym of fileSymbols) {
          const lowerSym = sym.name.toLowerCase();
          const symTokens = splitIdentifier(sym.name);
          for (const term of terms) {
            if (lowerSym === term) {
              score += 75; // 3.0x exact-symbol boost
              reasons.push(`Symbol "${sym.name}" exact match (3.0x boost)`);
            } else if (symTokens.includes(term)) {
              score += 40;
              reasons.push(`Symbol "${sym.name}" token match for "${term}"`);
            } else if (lowerSym.includes(term)) {
              score += 20;
              reasons.push(`Symbol "${sym.name}" partial match for "${term}"`);
            }
          }
        }
      }

      // 4. Entry point boost (1.5x)
      const isEntryPoint =
        /^(index|main|app|server|entry|root)\.[a-z0-9]+$/i.test(fileName) ||
        /^src\/(index|main|app)\.[a-z0-9]+$/i.test(lowerPath);
      if (isEntryPoint) {
        score *= 1.5;
        if (score > 0) reasons.push("Key entry point boost");
      }

      // 5. Manifest boost (1.3x)
      const isManifest = /^(package\.json|cargo\.toml|go\.mod|pyproject\.toml|pom\.xml|requirements\.txt)$/i.test(
        fileName
      );
      if (isManifest) {
        score *= 1.3;
        if (score > 0) reasons.push("Project manifest boost");
      }

      if (score > 0) {
        scoredFiles.push({
          filePath: file.path,
          score: Math.round(score),
          reasons
        });
      }
    }

    // Sort by descending score
    scoredFiles.sort((a, b) => b.score - a.score);

    const hasRelevantMatches = scoredFiles.length > 0;

    // Allocate chunks up to token budget (approx 400 tokens per file context snippet)
    const tokensPerFile = 400;
    const maxFiles = Math.max(1, Math.floor(maxTokens / tokensPerFile));

    const includedFiles = scoredFiles.slice(0, maxFiles).map((f) => f.filePath);
    const omittedFiles = scoredFiles.slice(maxFiles).map((f) => f.filePath);

    return {
      hasRelevantMatches,
      rankedFiles: scoredFiles,
      includedFiles,
      omittedFiles,
      omittedCount: omittedFiles.length
    };
  }
}
