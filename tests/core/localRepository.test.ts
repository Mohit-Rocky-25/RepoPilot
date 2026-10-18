import { describe, it, expect, vi } from "vitest";
import {
  isPathIgnored,
  detectLanguageFromExtension,
  simpleHash,
  parseLocalFolder
} from "../../src/lib/localRepository";

describe("Local Repository Ingestion - Path Filtering", () => {
  it("ignores standard dependency and build directories", () => {
    expect(isPathIgnored("node_modules/react/index.js")).toBe(true);
    expect(isPathIgnored(".git/config")).toBe(true);
    expect(isPathIgnored(".next/static/chunks/app.js")).toBe(true);
    expect(isPathIgnored("dist/bundle.js")).toBe(true);
    expect(isPathIgnored("build/index.html")).toBe(true);
    expect(isPathIgnored(".venv/lib/python3.10/site-packages")).toBe(true);
    expect(isPathIgnored("src/__pycache__/module.cpython-310.pyc")).toBe(true);
    expect(isPathIgnored(".DS_Store")).toBe(true);
    expect(isPathIgnored("deep/nested/.vscode/settings.json")).toBe(true);
  });

  it("permits regular source and configuration files", () => {
    expect(isPathIgnored("src/app/page.tsx")).toBe(false);
    expect(isPathIgnored("package.json")).toBe(false);
    expect(isPathIgnored("lib/utils.ts")).toBe(false);
    expect(isPathIgnored("internal/server/main.go")).toBe(false);
    expect(isPathIgnored("README.md")).toBe(false);
  });
});

describe("Local Repository Ingestion - Language & Extension Detection", () => {
  it("detects language accurately across extensions", () => {
    expect(detectLanguageFromExtension("app.tsx")).toEqual({
      extension: "tsx",
      language: "TypeScript"
    });
    expect(detectLanguageFromExtension("server.py")).toEqual({
      extension: "py",
      language: "Python"
    });
    expect(detectLanguageFromExtension("main.go")).toEqual({
      extension: "go",
      language: "Go"
    });
    expect(detectLanguageFromExtension("Dockerfile")).toEqual({
      extension: "dockerfile",
      language: "Dockerfile"
    });
    expect(detectLanguageFromExtension("Makefile")).toEqual({
      extension: "",
      language: undefined
    });
  });
});

describe("Local Repository Ingestion - Hash Generation", () => {
  it("generates deterministic 8-character hex pseudo-SHAs", () => {
    const hash1 = simpleHash("src/index.ts:1024:console.log('hi')");
    const hash2 = simpleHash("src/index.ts:1024:console.log('hi')");
    const hash3 = simpleHash("src/index.ts:1024:console.log('bye')");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(8);
  });
});

describe("Local Repository Ingestion - parseLocalFolder", () => {
  it("parses simulated FileList into valid Repository and RepositoryFiles", async () => {
    const mockFile1 = {
      name: "page.tsx",
      webkitRelativePath: "my-web-app/src/page.tsx",
      size: 150,
      text: async () => "export default function Page() {\n  return <div>Hello</div>;\n}\n"
    } as unknown as File;

    const mockFile2 = {
      name: "package.json",
      webkitRelativePath: "my-web-app/package.json",
      size: 80,
      text: async () => '{\n  "name": "my-web-app",\n  "version": "1.0.0"\n}\n'
    } as unknown as File;

    const mockIgnored = {
      name: "react.js",
      webkitRelativePath: "my-web-app/node_modules/react.js",
      size: 500,
      text: async () => "module.exports = {}"
    } as unknown as File;

    const progressTracker = vi.fn();

    const result = await parseLocalFolder([mockFile1, mockFile2, mockIgnored], progressTracker);

    expect(result.repository.owner).toBe("local");
    expect(result.repository.repo).toBe("my-web-app");
    expect(result.repository.fullName).toBe("local/my-web-app");
    expect(result.repository.url).toBe("local://workspace/my-web-app");
    expect(result.repository.isLocal).toBe(true);

    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe("package.json");
    expect(result.files[0].content).toContain('"my-web-app"');
    expect(result.files[1].path).toBe("src/page.tsx");
    expect(result.files[1].lineCount).toBe(4);
    expect(result.files[1].sha).toMatch(/^loc_[a-f0-9]{8}$/);

    expect(progressTracker).toHaveBeenCalled();
  });

  it("throws error if no valid files exist", async () => {
    const mockIgnored = {
      name: "cache.tmp",
      webkitRelativePath: "junk/node_modules/cache.tmp",
      size: 50,
      text: async () => ""
    } as unknown as File;

    await expect(parseLocalFolder([mockIgnored])).rejects.toThrow("No readable source files found");
  });
});
