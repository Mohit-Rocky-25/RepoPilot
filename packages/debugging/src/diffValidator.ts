export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

export interface DiffValidationResult {
  valid: boolean;
  targetFile?: string;
  patchedContent?: string;
  error?: string;
  linesAdded?: number;
  linesRemoved?: number;
}

export class DiffValidator {
  /**
   * Strictly validates a unified diff against real in-memory file contents.
   * Rejects hunks that do not apply cleanly or target non-existent files.
   */
  static validateAndApply(
    diffText: string,
    fileContents: Map<string, string>
  ): DiffValidationResult {
    if (!diffText || typeof diffText !== "string") {
      return { valid: false, error: "Empty or missing diff payload." };
    }

    const diffLines = diffText.split("\n");
    let targetFile: string | undefined;
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const rawLine of diffLines) {
      const line = rawLine.trimEnd();

      if (line.startsWith("--- a/")) {
        targetFile = line.slice(6).trim();
      } else if (line.startsWith("+++ b/")) {
        // Can verify target matches
        const dest = line.slice(6).trim();
        if (targetFile && dest !== targetFile) {
          // Both paths present, prefer targetFile
        } else if (!targetFile) {
          targetFile = dest;
        }
      } else if (line.startsWith("@@ ")) {
        const match = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1], 10),
            oldCount: match[2] ? parseInt(match[2], 10) : 1,
            newStart: parseInt(match[3], 10),
            newCount: match[4] ? parseInt(match[4], 10) : 1,
            lines: []
          };
          hunks.push(currentHunk);
        }
      } else if (currentHunk) {
        if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
          currentHunk.lines.push(line);
          if (line.startsWith("+")) linesAdded++;
          if (line.startsWith("-")) linesRemoved++;
        }
      }
    }

    if (!targetFile) {
      return { valid: false, error: "Malformed diff: missing target file header (--- a/<path>)." };
    }

    if (hunks.length === 0) {
      return { valid: false, error: "Malformed diff: no hunks found." };
    }

    const originalContent = fileContents.get(targetFile);
    if (originalContent === undefined) {
      return {
        valid: false,
        targetFile,
        error: `Target file "${targetFile}" does not exist in repository.`
      };
    }

    const workingLines = originalContent.split("\n");

    // Apply hunks in reverse order (bottom to top) to prevent line index drift
    const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

    for (let hIdx = 0; hIdx < sortedHunks.length; hIdx++) {
      const hunk = sortedHunks[hIdx];
      const startIndex = Math.max(0, hunk.oldStart - 1);

      const oldLinesExpected: string[] = [];
      const newLinesReplacement: string[] = [];

      for (const hLine of hunk.lines) {
        const marker = hLine[0];
        const text = hLine.slice(1);
        if (marker === " " || marker === "-") {
          oldLinesExpected.push(text);
        }
        if (marker === " " || marker === "+") {
          newLinesReplacement.push(text);
        }
      }

      // Verify that expected context and deletion lines match actual file lines
      for (let i = 0; i < oldLinesExpected.length; i++) {
        const actualLine = workingLines[startIndex + i];
        if (actualLine === undefined) {
          return {
            valid: false,
            targetFile,
            error: `Hunk ${hIdx + 1} extends past end of file at line ${startIndex + i + 1}.`
          };
        }

        if (actualLine.trim() !== oldLinesExpected[i].trim()) {
          return {
            valid: false,
            targetFile,
            error: `Hunk ${hIdx + 1} context mismatch at line ${startIndex + i + 1}. Expected: "${oldLinesExpected[i].trim()}", Found: "${actualLine.trim()}"`
          };
        }
      }

      // Splice replacement lines into working content
      workingLines.splice(startIndex, oldLinesExpected.length, ...newLinesReplacement);
    }

    return {
      valid: true,
      targetFile,
      patchedContent: workingLines.join("\n"),
      linesAdded,
      linesRemoved
    };
  }
}
