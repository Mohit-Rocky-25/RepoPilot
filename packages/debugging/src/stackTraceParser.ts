export interface StackFrame {
  raw: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  functionName?: string;
  isUserCode: boolean;
  isDependency: boolean;
  candidateFiles: string[];
}

export interface ParsedTrace {
  errorType?: string;
  errorMessage?: string;
  frames: StackFrame[];
  chainedExceptions?: { type: string; message: string }[];
}

const ANSI_REGEX = /\x1B\[[0-9;]*[a-zA-Z]/g;
const MAX_TRACE_SIZE = 65536; // 64 KB

export class StackTraceParser {
  /**
   * Safely parses stack traces for Node/V8, Python (with chained exceptions), Go panics, and Rust panics.
   * Strips ANSI colors, caps size at 64 KB, normalizes Windows paths, and maps candidate repo files.
   */
  static parse(rawTrace: string, repoFilePaths: string[] = []): ParsedTrace {
    if (!rawTrace || typeof rawTrace !== "string") {
      return { frames: [] };
    }

    // 1. Cap size to 64 KB and strip ANSI escape sequences
    const traceText = rawTrace.slice(0, MAX_TRACE_SIZE).replace(ANSI_REGEX, "");
    const lines = traceText.split("\n");

    const frames: StackFrame[] = [];
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    const chainedExceptions: { type: string; message: string }[] = [];

    // Pre-normalize repo paths to lowercase forward slashes
    const normalizedRepoFiles = repoFilePaths.map((p) => ({
      original: p,
      normalized: p.replace(/\\/g, "/").toLowerCase()
    }));

    // Regex patterns
    // 1. Node.js / V8
    // at Object.<anonymous> (src/app/api/auth.ts:42:15) or at render (C:\repo\components\Button.tsx:18:5)
    const nodePattern = /^\s*at\s+(?:([a-zA-Z0-9_$.<>]+)\s+\()?(?:([a-zA-Z]:[\\/][^:]+|\/[^:]+|[a-zA-Z0-9_\-./\\]+)):(\d+):(\d+)\)?$/;

    // 2. Python: File "src/pipeline.py", line 42, in process_data
    const pyPattern = /^\s*File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+([a-zA-Z0-9_<>\s]+))?$/;

    // 3. Go: /path/to/main.go:85 +0x1a or main.go:85
    const goPattern = /^\s*([a-zA-Z0-9_\-./\\]+\.go):(\d+)(?:\s+\+0x[0-9a-fA-F]+)?$/;

    // 4. Rust: at src/main.rs:24:5 or panicked at '...', src/main.rs:24:5
    const rustPattern = /(?:at\s+|panicked at.*,\s+)([a-zA-Z0-9_\-./\\]+\.rs):(\d+)(?::(\d+))?/;

    // Helper to map and classify file paths
    const classifyPath = (
      rawFilePath: string
    ): { filePath: string; isUserCode: boolean; isDependency: boolean; candidateFiles: string[] } => {
      const normalized = rawFilePath.replace(/\\/g, "/");
      const lower = normalized.toLowerCase();

      const isDependency =
        lower.includes("node_modules/") ||
        lower.includes("site-packages/") ||
        lower.includes("/usr/lib/") ||
        lower.includes("/usr/local/go/") ||
        lower.includes("/go/src/") ||
        lower.includes("go/pkg/") ||
        lower.includes("/rustc/") ||
        lower.includes("github.com/") ||
        lower.includes("go/pkg/mod/") ||
        lower.includes(".cargo/registry/") ||
        lower.includes("<anonymous>") ||
        lower.startsWith("node:") ||
        lower.startsWith("internal/");

      // Match against repo files by exact or suffix match
      const matching: string[] = [];
      for (const rf of normalizedRepoFiles) {
        if (rf.normalized === lower || lower.endsWith("/" + rf.normalized)) {
          matching.push(rf.original);
        } else {
          // Suffix matching e.g. "utils.py" matches "src/utils.py"
          const segments = rf.normalized.split("/");
          const lastSegment = segments[segments.length - 1];
          if (lower.endsWith("/" + lastSegment) || lower === lastSegment) {
            matching.push(rf.original);
          }
        }
      }

      const isUserCode = !isDependency && matching.length > 0;
      const resolvedPath = matching[0] || normalized;

      return {
        filePath: resolvedPath,
        isUserCode,
        isDependency,
        candidateFiles: matching
      };
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      if (!line) continue;

      // Detect Python chained exceptions
      if (line.includes("During handling of the above exception, another exception occurred:") ||
          line.includes("The above exception was the direct cause of the following exception:")) {
        if (errorType) {
          chainedExceptions.push({ type: errorType, message: errorMessage || "" });
          errorType = undefined;
          errorMessage = undefined;
        }
        continue;
      }

      // Detect Rust panics
      if (!errorType && line.startsWith("thread '") && line.includes("panicked at")) {
        const panicIdx = line.indexOf("panicked at");
        const afterPanic = line.slice(panicIdx + "panicked at".length).trim();
        const commaIdx = afterPanic.lastIndexOf(",");
        if (commaIdx !== -1) {
          const msgPart = afterPanic.slice(0, commaIdx).trim();
          errorType = line.slice(0, panicIdx + "panicked at".length + 1 + msgPart.length).trim();
          errorMessage = msgPart.replace(/^['"]|['"]$/g, "");
          const locPart = afterPanic.slice(commaIdx + 1).trim();
          const locMatch = locPart.match(/([^:]+):(\d+)(?::(\d+))?/);
          if (locMatch) {
            const { filePath, isUserCode, isDependency, candidateFiles } = classifyPath(locMatch[1].trim());
            frames.push({
              filePath,
              lineNumber: parseInt(locMatch[2], 10),
              columnNumber: locMatch[3] ? parseInt(locMatch[3], 10) : undefined,
              functionName: "panicked",
              isUserCode,
              isDependency,
              candidateFiles,
              raw: line
            });
          }
        } else {
          errorType = line.trim();
          errorMessage = afterPanic;
        }
        continue;
      }

      // Detect error header
      if (!errorType && (line.includes(":") || line.startsWith("panic:"))) {
        if (line.startsWith("panic:")) {
          errorType = "Panic";
          errorMessage = line.slice(6).trim();
          continue;
        }
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const prefix = line.slice(0, colonIdx).trim();
          if (
            prefix.endsWith("Error") ||
            prefix.endsWith("Exception") ||
            prefix === "AssertionError"
          ) {
            errorType = prefix;
            errorMessage = line.slice(colonIdx + 1).trim();
            continue;
          }
        }
      }

      // 1. Check Node.js
      let match = nodePattern.exec(line);
      if (match) {
        const fnName = match[1] || undefined;
        const rawFilePath = match[2];
        const lineNum = parseInt(match[3], 10);
        const colNum = match[4] ? parseInt(match[4], 10) : undefined;
        const info = classifyPath(rawFilePath);

        frames.push({
          raw: line,
          filePath: info.filePath,
          lineNumber: lineNum,
          columnNumber: colNum,
          functionName: fnName,
          isUserCode: info.isUserCode,
          isDependency: info.isDependency,
          candidateFiles: info.candidateFiles
        });
        continue;
      }

      // 2. Check Python
      match = pyPattern.exec(line);
      if (match) {
        const rawFilePath = match[1];
        const lineNum = parseInt(match[2], 10);
        const fnName = match[3] || undefined;
        const info = classifyPath(rawFilePath);

        frames.push({
          raw: line,
          filePath: info.filePath,
          lineNumber: lineNum,
          functionName: fnName,
          isUserCode: info.isUserCode,
          isDependency: info.isDependency,
          candidateFiles: info.candidateFiles
        });
        continue;
      }

      // 3. Check Go
      match = goPattern.exec(line);
      if (match) {
        const rawFilePath = match[1];
        const lineNum = parseInt(match[2], 10);
        const info = classifyPath(rawFilePath);

        frames.push({
          raw: line,
          filePath: info.filePath,
          lineNumber: lineNum,
          isUserCode: info.isUserCode,
          isDependency: info.isDependency,
          candidateFiles: info.candidateFiles
        });
        continue;
      }

      // 4. Check Rust
      match = rustPattern.exec(line);
      if (match) {
        const rawFilePath = match[1];
        const lineNum = parseInt(match[2], 10);
        const colNum = match[3] ? parseInt(match[3], 10) : undefined;
        const info = classifyPath(rawFilePath);

        frames.push({
          raw: line,
          filePath: info.filePath,
          lineNumber: lineNum,
          columnNumber: colNum,
          isUserCode: info.isUserCode,
          isDependency: info.isDependency,
          candidateFiles: info.candidateFiles
        });
        continue;
      }
    }

    return {
      errorType,
      errorMessage,
      frames,
      chainedExceptions: chainedExceptions.length > 0 ? chainedExceptions : undefined
    };
  }
}
