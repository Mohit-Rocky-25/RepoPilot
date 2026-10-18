import { describe, it, expect } from "vitest";
import { StackTraceParser } from "../../packages/debugging/src/stackTraceParser";

describe("Stack Trace Parser - Multi-Language & Classification", () => {
  const repoFiles = [
    "src/components/Dashboard.tsx",
    "src/app/page.tsx",
    "src/server.py",
    "src/services/auth.py",
    "main.go",
    "pkg/api/handler.go",
    "src/main.rs",
    "src/lib.rs",
    "packages/core/src/utils.ts",
    "src/utils.ts",
    "src/main/java/com/example/PaymentService.java",
    "src/Controllers/HomeController.cs"
  ];

  it("parses Node.js stack traces with Windows paths and ANSI stripping", () => {
    const trace = `\x1B[31mTypeError: Cannot read properties of undefined (reading 'items')\x1B[0m
    at renderDashboard (C:\\Users\\dev\\project\\src\\components\\Dashboard.tsx:42:18)
    at Object.<anonymous> (node_modules/react-dom/index.js:15:10)
    at App (src/app/page.tsx:28:12)`;

    const parsed = StackTraceParser.parse(trace, repoFiles);

    expect(parsed.errorType).toBe("TypeError");
    expect(parsed.errorMessage).toBe("Cannot read properties of undefined (reading 'items')");
    expect(parsed.frames.length).toBe(3);

    // Frame 1: User code (Windows path resolved)
    expect(parsed.frames[0].filePath).toBe("src/components/Dashboard.tsx");
    expect(parsed.frames[0].lineNumber).toBe(42);
    expect(parsed.frames[0].columnNumber).toBe(18);
    expect(parsed.frames[0].functionName).toBe("renderDashboard");
    expect(parsed.frames[0].isUserCode).toBe(true);
    expect(parsed.frames[0].isDependency).toBe(false);

    // Frame 2: Dependency
    expect(parsed.frames[1].isDependency).toBe(true);
    expect(parsed.frames[1].isUserCode).toBe(false);

    // Frame 3: User code
    expect(parsed.frames[2].filePath).toBe("src/app/page.tsx");
    expect(parsed.frames[2].isUserCode).toBe(true);
  });

  it("parses Python tracebacks with chained exceptions", () => {
    const pyTrace = `Traceback (most recent call last):
  File "src/server.py", line 18, in handle_request
    data = fetch_record()
KeyError: 'user_id'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "src/services/auth.py", line 45, in verify_token
    raise RuntimeError("Auth failed")
RuntimeError: Auth failed`;

    const parsed = StackTraceParser.parse(pyTrace, repoFiles);

    expect(parsed.errorType).toBe("RuntimeError");
    expect(parsed.errorMessage).toBe("Auth failed");
    expect(parsed.chainedExceptions).toBeDefined();
    expect(parsed.chainedExceptions?.length).toBe(1);
    expect(parsed.chainedExceptions?.[0].type).toBe("KeyError");

    expect(parsed.frames.length).toBe(2);
    expect(parsed.frames[0].filePath).toBe("src/server.py");
    expect(parsed.frames[0].lineNumber).toBe(18);
    expect(parsed.frames[0].isUserCode).toBe(true);

    expect(parsed.frames[1].filePath).toBe("src/services/auth.py");
    expect(parsed.frames[1].lineNumber).toBe(45);
    expect(parsed.frames[1].isUserCode).toBe(true);
  });

  it("parses Go panics and classifies stdlib frames", () => {
    const goTrace = `panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: code=0x1 addr=0x0 pc=0x10a2f4c]

goroutine 1 [running]:
main.main()
	/home/runner/work/repo/main.go:85 +0x1a
net/http.(*Server).Serve(0xc0000a6000, {0x10dc448, 0xc0000a4000})
	/usr/local/go/src/net/http/server.go:2938 +0x240`;

    const parsed = StackTraceParser.parse(goTrace, repoFiles);

    expect(parsed.errorType).toBe("Panic");
    expect(parsed.errorMessage).toContain("nil pointer dereference");
    expect(parsed.frames.length).toBe(2);

    expect(parsed.frames[0].filePath).toBe("main.go");
    expect(parsed.frames[0].lineNumber).toBe(85);
    expect(parsed.frames[0].isUserCode).toBe(true);

    expect(parsed.frames[1].isDependency).toBe(true);
    expect(parsed.frames[1].isUserCode).toBe(false);
  });

  it("parses Rust panics and backtraces", () => {
    const rustTrace = `thread 'main' panicked at 'called Option::unwrap() on a None value', src/main.rs:24:5
stack backtrace:
   0: std::panicking::begin_panic
   1: my_crate::process
             at src/lib.rs:18:9`;

    const parsed = StackTraceParser.parse(rustTrace, repoFiles);

    expect(parsed.errorType).toBe("thread 'main' panicked at 'called Option::unwrap() on a None value'");
    expect(parsed.frames.length).toBeGreaterThanOrEqual(1);

    const mainFrame = parsed.frames.find((f) => f.filePath === "src/main.rs");
    expect(mainFrame).toBeDefined();
    expect(mainFrame?.lineNumber).toBe(24);
    expect(mainFrame?.isUserCode).toBe(true);
  });

  it("identifies candidate matches when multiple repo files share a filename suffix", () => {
    const trace = `at utilMethod (utils.ts:10:4)`;

    const parsed = StackTraceParser.parse(trace, repoFiles);
    expect(parsed.frames.length).toBe(1);
    expect(parsed.frames[0].candidateFiles.length).toBe(2);
    expect(parsed.frames[0].candidateFiles).toContain("src/utils.ts");
    expect(parsed.frames[0].candidateFiles).toContain("packages/core/src/utils.ts");
  });

  it("parses Java/JVM stack traces and classifies spring/java dependencies", () => {
    const javaTrace = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke method on null
    at com.example.PaymentService.process(PaymentService.java:64)
    at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
    at java.base/java.lang.Thread.run(Thread.java:833)`;

    const parsed = StackTraceParser.parse(javaTrace, repoFiles);
    expect(parsed.errorType).toBe("java.lang.NullPointerException");
    expect(parsed.errorMessage).toBe("Cannot invoke method on null");
    expect(parsed.frames.length).toBe(1); // User frame mapped
    expect(parsed.frames[0].filePath).toBe("src/main/java/com/example/PaymentService.java");
    expect(parsed.frames[0].lineNumber).toBe(64);
    expect(parsed.frames[0].isUserCode).toBe(true);
  });

  it("parses C# / .NET stack traces with line numbers", () => {
    const dotnetTrace = `System.InvalidOperationException: Sequence contains no elements
   at RepoPilot.Controllers.HomeController.Index() in C:\\Users\\runner\\project\\src\\Controllers\\HomeController.cs:line 32
   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.Execute(IActionResultTypeMapper mapper, MethodInfo methodInfo, Object target, Object[] arguments)`;

    const parsed = StackTraceParser.parse(dotnetTrace, repoFiles);
    expect(parsed.errorType).toBe("System.InvalidOperationException");
    expect(parsed.errorMessage).toBe("Sequence contains no elements");
    expect(parsed.frames.length).toBe(1);
    expect(parsed.frames[0].filePath).toBe("src/Controllers/HomeController.cs");
    expect(parsed.frames[0].lineNumber).toBe(32);
    expect(parsed.frames[0].isUserCode).toBe(true);
  });

  it("handles empty, malformed, non-string, or random text inputs gracefully", () => {
    expect(StackTraceParser.parse("").frames).toEqual([]);
    expect(StackTraceParser.parse(null as any).frames).toEqual([]);
    expect(StackTraceParser.parse(undefined as any).frames).toEqual([]);
    expect(StackTraceParser.parse("just some normal logs with no trace here\nsecond line").frames).toEqual([]);
  });

  it("safely truncates massive traces exceeding 64KB without crashing or hanging", () => {
    const largeLine = "    at render (src/components/Dashboard.tsx:42:18)\n";
    const hugeTrace = "Error: Overload\n" + largeLine.repeat(2000); // ~100KB
    expect(hugeTrace.length).toBeGreaterThan(65536);

    const parsed = StackTraceParser.parse(hugeTrace, repoFiles);
    expect(parsed.frames.length).toBeGreaterThan(0);
    expect(parsed.frames[0].filePath).toBe("src/components/Dashboard.tsx");
  });
});
