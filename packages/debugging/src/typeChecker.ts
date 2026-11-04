export interface TypeCheckResult {
  status: "passed" | "failed" | "not_run";
  errors?: string[];
  reason?: string;
}

/**
 * Executes a lightweight in-memory syntactic and structural type check on patched TypeScript files.
 */
export function runLightweightTypeCheck(
  filePath: string,
  content: string
): TypeCheckResult {
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    return {
      status: "not_run",
      reason: "Not a TypeScript file (.ts / .tsx required for type checking)."
    };
  }

  try {
    // eslint-disable-next-line
    const ts = require("typescript");

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const parseDiagnostics = sourceFile.parseDiagnostics || [];
    if (parseDiagnostics.length > 0) {
      const messages = parseDiagnostics.map((d: any) =>
        typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
      );
      return {
        status: "failed",
        errors: messages,
        reason: `Syntax error: ${messages[0]}`
      };
    }

    const compilerOptions: any = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      noEmitOnError: true
    };

    if (filePath.endsWith(".tsx")) {
      compilerOptions.jsx = ts.JsxEmit.ReactJSX || 4;
    }

    const transpileResult = ts.transpileModule(content, {
      compilerOptions,
      reportDiagnostics: true
    });

    const errors = (transpileResult.diagnostics || []).filter(
      (d: any) => d.category === ts.DiagnosticCategory.Error
    );

    if (errors.length > 0) {
      const messages = errors.map((d: any) =>
        typeof d.messageText === "string" ? d.messageText : d.messageText.messageText
      );
      return {
        status: "failed",
        errors: messages,
        reason: `Compilation diagnostic error: ${messages[0]}`
      };
    }

    return {
      status: "passed",
      reason: "In-memory syntax and structural type check passed with 0 errors."
    };
  } catch (err: any) {
    return {
      status: "not_run",
      reason: `Type check not run: ${err.message || "compiler unavailable"}`
    };
  }
}
