import { z } from "zod";

/**
 * Strict GitHub URL regex:
 * e.g., https://github.com/facebook/react or https://github.com/facebook/react.git
 */
export const GitHubUrlSchema = z
  .string()
  .trim()
  .regex(
    /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?\/?$/,
    "Must be a valid public GitHub repository URL (e.g., https://github.com/owner/repo)"
  )
  .transform((val) => {
    let normalized = val.trim();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    if (normalized.endsWith(".git")) {
      normalized = normalized.slice(0, -4);
    }
    return normalized;
  });

export const RepoUrlSchema = z.union([
  GitHubUrlSchema,
  z
    .string()
    .trim()
    .regex(
      /^local:\/\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/,
      "Must be a valid local workspace identifier (e.g. local://workspace/project)"
    )
]);

export const RepositoryReferenceSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  url: RepoUrlSchema,
  fullName: z.string().min(1),
  defaultBranch: z.string().default("main"),
  selectedRevision: z.string().optional(),
  stars: z.number().nonnegative().optional(),
  forks: z.number().nonnegative().optional(),
  description: z.string().nullable().optional(),
  primaryLanguage: z.string().nullable().optional(),
  openIssuesCount: z.number().nonnegative().optional(),
  license: z.string().nullable().optional(),
  isLocal: z.boolean().optional()
});

export const RepositoryRevisionSchema = z.object({
  commitSha: z.string().min(7),
  treeSha: z.string().min(7),
  author: z.string(),
  date: z.string(),
  message: z.string()
});

export const RepositoryFileSchema = z.object({
  path: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.enum(["blob", "tree"]),
  sha: z.string().min(7),
  language: z.string().optional(),
  extension: z.string().optional(),
  isBinary: z.boolean().default(false),
  lineCount: z.number().nonnegative().optional(),
  content: z.string().optional()
});

export const IndexedSymbolSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.enum([
    "function",
    "method",
    "class",
    "interface",
    "type",
    "variable",
    "constant",
    "import",
    "export"
  ]),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  signature: z.string().optional(),
  docstring: z.string().optional(),
  confidence: z.enum(["ast", "heuristic"]).optional()
});

export const SourceReferenceSchema = z.object({
  repoKey: z.string(),
  commitSha: z.string().min(7),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  codeSnippet: z.string(),
  url: z.string().url().optional()
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  type: z.enum(["text", "symbol", "path", "all"]).default("all"),
  pathPrefix: z.string().optional(),
  language: z.string().optional(),
  caseSensitive: z.boolean().default(false),
  limit: z.number().int().positive().max(100).default(30)
});

export const SearchResultSchema = z.object({
  filePath: z.string(),
  lineNumber: z.number().int().positive(),
  matchType: z.enum(["exact", "symbol", "path", "fuzzy"]),
  previewText: z.string(),
  symbolKind: z.string().optional(),
  score: z.number()
});

export const AnalysisStatusSchema = z.enum([
  "idle",
  "queued",
  "fetching_metadata",
  "fetching_tree",
  "indexing_symbols",
  "analyzing_architecture",
  "completed",
  "failed"
]);

export const AnalysisJobSchema = z.object({
  id: z.string(),
  repoKey: z.string(),
  commitSha: z.string(),
  status: AnalysisStatusSchema,
  progressPercent: z.number().min(0).max(100),
  totalFiles: z.number().int().nonnegative().default(0),
  indexedFiles: z.number().int().nonnegative().default(0),
  symbolsCount: z.number().int().nonnegative().default(0),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CodeQuestionSchema = z.object({
  repoKey: z.string(),
  commitSha: z.string(),
  question: z.string().min(3),
  targetFilePath: z.string().optional()
});

export const EvidenceSchema = z.object({
  sourceReference: SourceReferenceSchema,
  relevanceScore: z.number().min(0).max(1),
  rationale: z.string()
});

export const BugReportSchema = z.object({
  repoKey: z.string(),
  commitSha: z.string(),
  title: z.string().min(3),
  description: z.string().min(5),
  stackTrace: z.string().optional(),
  logs: z.string().optional(),
  reproductionSteps: z.array(z.string()).optional()
});

export const BugHypothesisSchema = z.object({
  id: z.string(),
  rank: z.number().int().positive(),
  culpritFile: z.string(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  evidenceCitations: z.array(SourceReferenceSchema)
});

export const PatchProposalSchema = z.object({
  id: z.string(),
  bugId: z.string(),
  filePath: z.string(),
  diff: z.string(),
  rationale: z.string(),
  suggestedTests: z.array(z.string()),
  verificationStatus: z.enum(["unverified", "verified_manual", "failed"]).default("unverified")
});

export const AIProviderConfigurationSchema = z.object({
  provider: z.enum(["ollama", "none"]).default("ollama"),
  baseUrl: z.string().default("http://localhost:11434"),
  modelName: z.string().default("qwen2.5-coder:1.5b"),
  isAvailable: z.boolean().default(false),
  lastPing: z.string().optional(),
  error: z.string().optional()
});
