import type { IndexedSymbol } from "@repopilot/core";

// Cache for tree-sitter parser and loaded language grammars
let treeSitterInitialized = false;
let treeSitterInitPromise: Promise<boolean> | null = null;
let ParserConstructor: any = null;
const loadedLanguages = new Map<string, any>();

/**
 * Lazily initialize web-tree-sitter and locate wasm files.
 * Returns true if tree-sitter is ready for use, false if unavailable.
 */
export async function initTreeSitter(): Promise<boolean> {
  if (treeSitterInitialized) return true;
  if (treeSitterInitPromise) return treeSitterInitPromise;

  treeSitterInitPromise = (async () => {
    try {
      // In browser or non-node environments, check if tree-sitter is present
      const Parser = (await import("web-tree-sitter")).default || (await import("web-tree-sitter"));
      ParserConstructor = Parser;

      let locateFile: ((file: string) => string) | undefined;
      if (typeof window === "undefined") {
        try {
          const path = await import("path");
          locateFile = (file: string) => {
            return path.resolve("node_modules/web-tree-sitter", file);
          };
        } catch {
          // ignore path import failure
        }
      }

      await Parser.init(locateFile ? { locateFile } : undefined);
      treeSitterInitialized = true;
      return true;
    } catch (err) {
      // Gracefully fall back to heuristic extraction if tree-sitter cannot be initialized
      return false;
    }
  })();

  return treeSitterInitPromise;
}

/**
 * Lazily load a language grammar into tree-sitter.
 */
async function getLanguageGrammar(langKey: string): Promise<any | null> {
  if (loadedLanguages.has(langKey)) {
    return loadedLanguages.get(langKey);
  }

  const ready = await initTreeSitter();
  if (!ready || !ParserConstructor) return null;

  try {
    const path = await import("path");
    const wasmBase = path.resolve("node_modules/tree-sitter-wasms/out");
    let wasmFileName = "";

    switch (langKey) {
      case "typescript":
        wasmFileName = "tree-sitter-typescript.wasm";
        break;
      case "tsx":
        wasmFileName = "tree-sitter-tsx.wasm";
        break;
      case "javascript":
        wasmFileName = "tree-sitter-javascript.wasm";
        break;
      case "python":
        wasmFileName = "tree-sitter-python.wasm";
        break;
      case "go":
        wasmFileName = "tree-sitter-go.wasm";
        break;
      case "rust":
        wasmFileName = "tree-sitter-rust.wasm";
        break;
      default:
        return null;
    }

    const wasmPath = path.join(wasmBase, wasmFileName);
    const lang = await ParserConstructor.Language.load(wasmPath);
    loadedLanguages.set(langKey, lang);
    return lang;
  } catch {
    return null;
  }
}

/**
 * Extracts symbols using real AST parsing via tree-sitter when available,
 * falling back gracefully to pattern extraction if grammars fail or on parse errors.
 */
export async function extractSymbols(
  filePath: string,
  content: string,
  language?: string
): Promise<IndexedSymbol[]> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const langKey = resolveLanguageKey(ext, language);

  if (langKey) {
    try {
      const grammar = await getLanguageGrammar(langKey);
      if (grammar && ParserConstructor) {
        const parser = new ParserConstructor();
        parser.setLanguage(grammar);
        const tree = parser.parse(content);

        // Check if rootNode is valid
        if (tree && tree.rootNode) {
          const symbols = extractFromAst(filePath, tree.rootNode, langKey, content);
          if (symbols.length > 0 || !tree.rootNode.hasError()) {
            return symbols;
          }
        }
      }
    } catch {
      // Per operating rules: per-file parse errors must not fail the index.
      // Fall back to heuristic pattern extractor.
    }
  }

  // Fallback heuristic pattern extractor
  return extractSymbolsHeuristic(filePath, content, language);
}

/**
 * Synchronous symbol extraction fallback.
 */
export function extractSymbolsSync(
  filePath: string,
  content: string,
  language?: string
): IndexedSymbol[] {
  return extractSymbolsHeuristic(filePath, content, language);
}

function resolveLanguageKey(ext?: string, language?: string): string | null {
  if (ext === "tsx") return "tsx";
  if (ext === "ts") return "typescript";
  if (ext === "jsx" || ext === "js" || ext === "mjs" || ext === "cjs") return "javascript";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "rs") return "rust";

  if (language === "TypeScript") return ext === "tsx" ? "tsx" : "typescript";
  if (language === "JavaScript") return "javascript";
  if (language === "Python") return "python";
  if (language === "Go") return "go";
  if (language === "Rust") return "rust";

  return null;
}

/**
 * Tree-sitter AST extraction traversal
 */
function extractFromAst(
  filePath: string,
  rootNode: any,
  langKey: string,
  content: string
): IndexedSymbol[] {
  const symbols: IndexedSymbol[] = [];
  const lines = content.split("\n");

  const getSig = (startRow: number, endRow: number) => {
    return lines[startRow]?.trim() || "";
  };

  function walk(node: any, parentClass: string | null = null) {
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;

    switch (langKey) {
      case "typescript":
      case "tsx":
      case "javascript": {
        if (node.type === "interface_declaration") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:iface:${name}:${startLine}`,
              name,
              kind: "interface",
              filePath,
              startLine,
              endLine,
              signature: `interface ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "type_alias_declaration") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:type:${name}:${startLine}`,
              name,
              kind: "type",
              filePath,
              startLine,
              endLine,
              signature: `type ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "class_declaration") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:class:${name}:${startLine}`,
              name,
              kind: "class",
              filePath,
              startLine,
              endLine,
              signature: `class ${name}`,
              confidence: "ast"
            });
            for (const child of node.children) {
              walk(child, name);
            }
            return;
          }
        } else if (node.type === "method_definition") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:method:${name}:${startLine}`,
              name,
              kind: "method",
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
            for (const child of node.children) {
              walk(child, parentClass);
            }
            return;
          }
        } else if (
          node.type === "function_declaration" ||
          node.type === "generator_function_declaration" ||
          node.type === "function_signature"
        ) {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:fn:${name}:${startLine}`,
              name,
              kind: "function",
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
            for (const child of node.children) {
              walk(child, parentClass);
            }
            return;
          }
        } else if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
          for (const decl of node.children) {
            if (decl.type === "variable_declarator") {
              const name = decl.childForFieldName("name")?.text;
              const val = decl.childForFieldName("value");
              if (name && val) {
                if (val.type === "arrow_function" || val.type === "function") {
                  symbols.push({
                    id: `${filePath}:fn:${name}:${startLine}`,
                    name,
                    kind: "function",
                    filePath,
                    startLine,
                    endLine: val.endPosition.row + 1,
                    signature: getSig(node.startPosition.row, node.endPosition.row),
                    confidence: "ast"
                  });
                  walk(val, parentClass);
                } else if (node.text.startsWith("export const") || node.text.startsWith("const")) {
                  symbols.push({
                    id: `${filePath}:const:${name}:${startLine}`,
                    name,
                    kind: "constant",
                    filePath,
                    startLine,
                    endLine,
                    signature: `const ${name}`,
                    confidence: "ast"
                  });
                }
              }
            }
          }
        }
        break;
      }

      case "python": {
        if (node.type === "class_definition") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:class:${name}:${startLine}`,
              name,
              kind: "class",
              filePath,
              startLine,
              endLine,
              signature: `class ${name}`,
              confidence: "ast"
            });
            for (const child of node.children) {
              walk(child, name);
            }
            return;
          }
        } else if (node.type === "function_definition") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            const kind = parentClass ? "method" : "function";
            symbols.push({
              id: `${filePath}:${kind === "method" ? "method" : "fn"}:${name}:${startLine}`,
              name,
              kind,
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
            for (const child of node.children) {
              walk(child, parentClass);
            }
            return;
          }
        } else if (node.type === "decorated_definition") {
          for (const child of node.children) {
            if (child.type === "function_definition" || child.type === "class_definition") {
              walk(child, parentClass);
            }
          }
          return;
        }
        break;
      }

      case "go": {
        if (node.type === "function_declaration") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:fn:${name}:${startLine}`,
              name,
              kind: "function",
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
          }
        } else if (node.type === "method_declaration") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:method:${name}:${startLine}`,
              name,
              kind: "method",
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
          }
        } else if (node.type === "type_declaration") {
          for (const child of node.children) {
            if (child.type === "type_spec") {
              const name = child.childForFieldName("name")?.text;
              const typeNode = child.childForFieldName("type");
              if (name) {
                const kind =
                  typeNode?.type === "struct_type"
                    ? "class"
                    : typeNode?.type === "interface_type"
                    ? "interface"
                    : "type";
                symbols.push({
                  id: `${filePath}:${kind}:${name}:${startLine}`,
                  name,
                  kind,
                  filePath,
                  startLine,
                  endLine: child.endPosition.row + 1,
                  signature: `type ${name}`,
                  confidence: "ast"
                });
              }
            }
          }
        } else if (node.type === "const_declaration") {
          for (const child of node.children) {
            if (child.type === "const_spec") {
              const name = child.childForFieldName("name")?.text || child.children[0]?.text;
              if (name) {
                symbols.push({
                  id: `${filePath}:const:${name}:${startLine}`,
                  name,
                  kind: "constant",
                  filePath,
                  startLine,
                  endLine: child.endPosition.row + 1,
                  signature: `const ${name}`,
                  confidence: "ast"
                });
              }
            }
          }
        }
        break;
      }

      case "rust": {
        if (node.type === "function_item") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            const kind = parentClass ? "method" : "function";
            symbols.push({
              id: `${filePath}:${kind === "method" ? "method" : "fn"}:${name}:${startLine}`,
              name,
              kind,
              filePath,
              startLine,
              endLine,
              signature: getSig(node.startPosition.row, node.endPosition.row),
              confidence: "ast"
            });
          }
        } else if (node.type === "struct_item") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:struct:${name}:${startLine}`,
              name,
              kind: "class",
              filePath,
              startLine,
              endLine,
              signature: `struct ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "trait_item") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:trait:${name}:${startLine}`,
              name,
              kind: "interface",
              filePath,
              startLine,
              endLine,
              signature: `trait ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "enum_item") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:enum:${name}:${startLine}`,
              name,
              kind: "type",
              filePath,
              startLine,
              endLine,
              signature: `enum ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "const_item") {
          const name = node.childForFieldName("name")?.text;
          if (name) {
            symbols.push({
              id: `${filePath}:const:${name}:${startLine}`,
              name,
              kind: "constant",
              filePath,
              startLine,
              endLine,
              signature: `const ${name}`,
              confidence: "ast"
            });
          }
        } else if (node.type === "impl_item") {
          const typeNode = node.childForFieldName("type");
          const implName = typeNode?.text || null;
          for (const child of node.children) {
            walk(child, implName);
          }
          return;
        }
        break;
      }
    }

    for (const child of node.children) {
      walk(child, parentClass);
    }
  }

  walk(rootNode, null);
  return symbols;
}

/**
 * Heuristic pattern extractor.
 * Always tags symbols with confidence: 'heuristic'.
 * Calculates multi-line spans where possible.
 */
export function extractSymbolsHeuristic(
  filePath: string,
  content: string,
  language?: string
): IndexedSymbol[] {
  const symbols: IndexedSymbol[] = [];
  const lines = content.split("\n");
  const ext = filePath.split(".").pop()?.toLowerCase();

  // JavaScript / TypeScript
  if (
    language === "TypeScript" ||
    language === "JavaScript" ||
    ext === "ts" ||
    ext === "tsx" ||
    ext === "js" ||
    ext === "jsx"
  ) {
    extractJsTsHeuristic(filePath, lines, symbols);
  }
  // Python
  else if (language === "Python" || ext === "py") {
    extractPythonHeuristic(filePath, lines, symbols);
  }
  // Go
  else if (language === "Go" || ext === "go") {
    extractGoHeuristic(filePath, lines, symbols);
  }
  // Rust
  else if (language === "Rust" || ext === "rs") {
    extractRustHeuristic(filePath, lines, symbols);
  }

  return symbols;
}

/**
 * Helper to calculate block end line based on brace balance
 */
function findBraceEndLine(lines: string[], startIdx: number): number {
  let openBraces = 0;
  let foundFirst = false;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      if (line[c] === "{") {
        openBraces++;
        foundFirst = true;
      } else if (line[c] === "}") {
        openBraces--;
        if (foundFirst && openBraces <= 0) {
          return i + 1;
        }
      }
    }
  }
  return startIdx + 1;
}

/**
 * Helper to calculate Python block end line based on indentation
 */
function findPythonEndLine(lines: string[], startIdx: number): number {
  const startIndent = lines[startIdx].search(/\S/);
  if (startIndent === -1) return startIdx + 1;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    if (indent !== -1 && indent <= startIndent) {
      return i; // previous line was the end
    }
  }
  return lines.length;
}

function extractJsTsHeuristic(filePath: string, lines: string[], symbols: IndexedSymbol[]) {
  const funcPattern = /(?:export\s+)?(?:async\s+)?function\s*\*?\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/;
  const arrowFuncPattern = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/;
  const constPattern = /(?:export\s+)?const\s+([A-Z0-9_$]+)\s*=/;
  const classPattern = /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/;
  const interfacePattern = /(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/;
  const typePattern = /(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/;
  const methodPattern = /^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{/;

  let insideClass = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;

    let match = funcPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:fn:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "function",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `function ${match[1]}(${match[2] || ""})`,
        confidence: "heuristic"
      });
      return;
    }

    match = arrowFuncPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:fn:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "function",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `const ${match[1]} = (${match[2] || ""}) =>`,
        confidence: "heuristic"
      });
      return;
    }

    match = classPattern.exec(trimmed);
    if (match) {
      insideClass = true;
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:class:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "class",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `class ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = interfacePattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:iface:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "interface",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `interface ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = typePattern.exec(trimmed);
    if (match) {
      symbols.push({
        id: `${filePath}:type:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "type",
        filePath,
        startLine: idx + 1,
        endLine: idx + 1,
        signature: `type ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = constPattern.exec(trimmed);
    if (match) {
      symbols.push({
        id: `${filePath}:const:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "constant",
        filePath,
        startLine: idx + 1,
        endLine: idx + 1,
        signature: `const ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    if (insideClass) {
      match = methodPattern.exec(line);
      if (match && !["if", "for", "while", "switch", "catch"].includes(match[1])) {
        const endLine = findBraceEndLine(lines, idx);
        symbols.push({
          id: `${filePath}:method:${match[1]}:${idx + 1}`,
          name: match[1],
          kind: "method",
          filePath,
          startLine: idx + 1,
          endLine,
          signature: `${match[1]}(${match[2] || ""})`,
          confidence: "heuristic"
        });
      }
    }
  });
}

function extractPythonHeuristic(filePath: string, lines: string[], symbols: IndexedSymbol[]) {
  const pyFuncPattern = /^(?:\s*)(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/;
  const pyClassPattern = /^(?:\s*)class\s+([a-zA-Z0-9_]+)/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) return;

    let match = pyClassPattern.exec(line);
    if (match) {
      const endLine = findPythonEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:class:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "class",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `class ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = pyFuncPattern.exec(line);
    if (match) {
      const isIndented = line.search(/\S/) > 0;
      const kind = isIndented ? "method" : "function";
      const endLine = findPythonEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:${kind === "method" ? "method" : "fn"}:${match[1]}:${idx + 1}`,
        name: match[1],
        kind,
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `def ${match[1]}(${match[2] || ""})`,
        confidence: "heuristic"
      });
    }
  });
}

function extractGoHeuristic(filePath: string, lines: string[], symbols: IndexedSymbol[]) {
  const goFuncPattern = /^func\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/;
  const goMethodPattern = /^func\s+\([^)]+\)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/;
  const goTypePattern = /^type\s+([a-zA-Z0-9_]+)\s+(struct|interface|[a-zA-Z0-9_]+)/;
  const goConstPattern = /^const\s+([a-zA-Z0-9_]+)\s*=/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return;

    let match = goMethodPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:method:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "method",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `func (...) ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = goFuncPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:fn:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "function",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `func ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = goTypePattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      const kind = match[2] === "struct" ? "class" : match[2] === "interface" ? "interface" : "type";
      symbols.push({
        id: `${filePath}:${kind}:${match[1]}:${idx + 1}`,
        name: match[1],
        kind,
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `type ${match[1]} ${match[2]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = goConstPattern.exec(trimmed);
    if (match) {
      symbols.push({
        id: `${filePath}:const:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "constant",
        filePath,
        startLine: idx + 1,
        endLine: idx + 1,
        signature: `const ${match[1]}`,
        confidence: "heuristic"
      });
    }
  });
}

function extractRustHeuristic(filePath: string, lines: string[], symbols: IndexedSymbol[]) {
  const rustFnPattern = /(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/;
  const rustStructPattern = /(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/;
  const rustEnumPattern = /(?:pub\s+)?enum\s+([a-zA-Z0-9_]+)/;
  const rustTraitPattern = /(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)/;
  const rustConstPattern = /(?:pub\s+)?const\s+([A-Z0-9_]+)\s*:/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return;

    let match = rustFnPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:fn:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "function",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `fn ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = rustStructPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:struct:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "class",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `struct ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = rustTraitPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:trait:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "interface",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `trait ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = rustEnumPattern.exec(trimmed);
    if (match) {
      const endLine = findBraceEndLine(lines, idx);
      symbols.push({
        id: `${filePath}:enum:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "type",
        filePath,
        startLine: idx + 1,
        endLine,
        signature: `enum ${match[1]}`,
        confidence: "heuristic"
      });
      return;
    }

    match = rustConstPattern.exec(trimmed);
    if (match) {
      symbols.push({
        id: `${filePath}:const:${match[1]}:${idx + 1}`,
        name: match[1],
        kind: "constant",
        filePath,
        startLine: idx + 1,
        endLine: idx + 1,
        signature: `const ${match[1]}`,
        confidence: "heuristic"
      });
    }
  });
}
