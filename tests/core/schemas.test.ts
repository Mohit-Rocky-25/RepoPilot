import { describe, it, expect } from "vitest";
import {
  GitHubUrlSchema,
  RepositoryReferenceSchema,
  SourceReferenceSchema,
  SearchQuerySchema
} from "../../packages/core/src/schemas";

describe("Domain Contracts - GitHubUrlSchema", () => {
  it("accepts valid public GitHub repository URLs", () => {
    expect(GitHubUrlSchema.parse("https://github.com/facebook/react")).toBe(
      "https://github.com/facebook/react"
    );
    expect(GitHubUrlSchema.parse("https://github.com/torvalds/linux.git")).toBe(
      "https://github.com/torvalds/linux"
    );
    expect(GitHubUrlSchema.parse("https://github.com/google/guava/")).toBe(
      "https://github.com/google/guava"
    );
  });

  it("rejects malicious or invalid URLs (SSRF prevention)", () => {
    expect(() => GitHubUrlSchema.parse("http://127.0.0.1:8000")).toThrow();
    expect(() => GitHubUrlSchema.parse("https://malicious.com/facebook/react")).toThrow();
    expect(() => GitHubUrlSchema.parse("file:///etc/passwd")).toThrow();
    expect(() => GitHubUrlSchema.parse("javascript:alert(1)")).toThrow();
    expect(() => GitHubUrlSchema.parse("https://github.com/")).toThrow();
  });
});

describe("Domain Contracts - RepositoryReferenceSchema", () => {
  it("validates a proper repository reference structure", () => {
    const validRepo = {
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
      fullName: "facebook/react",
      defaultBranch: "main",
      stars: 220000,
      forks: 45000,
      description: "The library for web and native user interfaces",
      primaryLanguage: "JavaScript"
    };

    const parsed = RepositoryReferenceSchema.parse(validRepo);
    expect(parsed.owner).toBe("facebook");
    expect(parsed.fullName).toBe("facebook/react");
    expect(parsed.defaultBranch).toBe("main");
  });

  it("validates a local repository reference with private local workspace URL", () => {
    const localRepo = {
      owner: "local",
      repo: "my-service",
      url: "local://workspace/my-service",
      fullName: "local/my-service",
      defaultBranch: "local",
      primaryLanguage: "TypeScript",
      isLocal: true
    };

    const parsed = RepositoryReferenceSchema.parse(localRepo);
    expect(parsed.isLocal).toBe(true);
    expect(parsed.url).toBe("local://workspace/my-service");
    expect(parsed.owner).toBe("local");
  });

  it("rejects invalid local workspace URLs", () => {
    const invalidLocalRepo = {
      owner: "local",
      repo: "bad",
      url: "local://invalid url with spaces",
      fullName: "local/bad",
      isLocal: true
    };

    expect(() => RepositoryReferenceSchema.parse(invalidLocalRepo)).toThrow();
  });
});

describe("Domain Contracts - SourceReferenceSchema", () => {
  it("ensures source citations contain exact line ranges and code snippets", () => {
    const citation = {
      repoKey: "facebook/react",
      commitSha: "abc1234567",
      filePath: "packages/react/src/React.js",
      startLine: 15,
      endLine: 25,
      codeSnippet: "export function useState(initialState) { return ... }"
    };

    const parsed = SourceReferenceSchema.parse(citation);
    expect(parsed.startLine).toBe(15);
    expect(parsed.endLine).toBe(25);
  });

  it("rejects invalid line numbers", () => {
    expect(() =>
      SourceReferenceSchema.parse({
        repoKey: "facebook/react",
        commitSha: "abc1234567",
        filePath: "packages/react/src/React.js",
        startLine: -5,
        endLine: 0,
        codeSnippet: ""
      })
    ).toThrow();
  });
});

describe("Domain Contracts - SearchQuerySchema", () => {
  it("applies query defaults and bounds", () => {
    const query = SearchQuerySchema.parse({
      query: "useState"
    });
    expect(query.type).toBe("all");
    expect(query.limit).toBe(30);
    expect(query.caseSensitive).toBe(false);
  });
});
