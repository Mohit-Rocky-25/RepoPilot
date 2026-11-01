import { describe, it, expect } from "vitest";
import {
  extractSymbols,
  extractSymbolsSync,
  extractSymbolsHeuristic
} from "../../packages/indexer/src/symbolExtractor";
import { ArchitectureAnalyzer } from "../../packages/analysis/src/architectureAnalyzer";
import type { RepositoryFile } from "@repopilot/core";

describe("Task 1: Java, C++, and Kotlin Symbol Extraction via Tree-sitter", () => {
  it("extracts classes, interfaces, enums, methods, and constructors with exact line spans from Spring-style Java sample", async () => {
    const javaCode = `package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController<T extends BaseDto> implements UserApi {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<T> getUser(@PathVariable String id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<Void> createUser(@RequestBody T request) {
        userService.save(request);
        return ResponseEntity.accepted().build();
    }
}

public interface UserApi {
    void ping();
}

public enum AccountStatus {
    ACTIVE,
    PENDING,
    SUSPENDED
}
`;

    const symbols = await extractSymbols("src/main/java/com/example/demo/controller/UserController.java", javaCode, "Java");

    expect(symbols.length).toBeGreaterThanOrEqual(6);

    // Class with generics and interface implementation
    const controllerClass = symbols.find((s) => s.name === "UserController" && s.kind === "class");
    expect(controllerClass).toBeDefined();
    expect(controllerClass?.kind).toBe("class");
    expect(controllerClass?.startLine).toBe(7);
    expect(controllerClass?.endLine).toBe(27);
    expect(controllerClass?.confidence).toBe("ast");

    // Constructor
    const constructorSym = symbols.find(
      (s) => s.name === "UserController" && s.kind === "method" && s.startLine >= 12
    );
    expect(constructorSym).toBeDefined();
    expect(constructorSym?.startLine).toBe(13);
    expect(constructorSym?.endLine).toBe(15);
    expect(constructorSym?.confidence).toBe("ast");

    // Methods
    const getMethod = symbols.find((s) => s.name === "getUser");
    expect(getMethod).toBeDefined();
    expect(getMethod?.kind).toBe("method");
    expect(getMethod?.startLine).toBe(17);
    expect(getMethod?.endLine).toBe(20);
    expect(getMethod?.confidence).toBe("ast");

    const postMethod = symbols.find((s) => s.name === "createUser");
    expect(postMethod).toBeDefined();
    expect(postMethod?.kind).toBe("method");
    expect(postMethod?.startLine).toBe(22);
    expect(postMethod?.endLine).toBe(26);
    expect(postMethod?.confidence).toBe("ast");

    // Interface
    const ifaceSym = symbols.find((s) => s.name === "UserApi");
    expect(ifaceSym).toBeDefined();
    expect(ifaceSym?.kind).toBe("interface");
    expect(ifaceSym?.startLine).toBe(29);
    expect(ifaceSym?.endLine).toBe(31);
    expect(ifaceSym?.confidence).toBe("ast");

    // Enum
    const enumSym = symbols.find((s) => s.name === "AccountStatus");
    expect(enumSym).toBeDefined();
    expect(enumSym?.kind).toBe("type");
    expect(enumSym?.startLine).toBe(33);
    expect(enumSym?.endLine).toBe(37);
    expect(enumSym?.confidence).toBe("ast");
  });

  it("extracts C++ classes, structs, enums, and functions with exact line spans", async () => {
    const cppCode = `#include <iostream>
#include <string>

namespace engine {
  class Renderer {
  public:
    Renderer(int width, int height);
    void renderFrame();
  };

  struct ViewportConfig {
    int x;
    int y;
  };

  enum class RenderMode {
    Wireframe,
    Shaded
  };

  void initializeGraphics() {
    std::cout << "Init" << std::endl;
  }
}
`;

    const symbols = await extractSymbols("src/renderer.cpp", cppCode, "C++");
    expect(symbols.length).toBeGreaterThanOrEqual(4);

    const rendererClass = symbols.find((s) => s.name === "Renderer" && s.kind === "class");
    expect(rendererClass).toBeDefined();
    expect(rendererClass?.startLine).toBe(5);

    const viewportStruct = symbols.find((s) => s.name === "ViewportConfig" && s.kind === "class");
    expect(viewportStruct).toBeDefined();
    expect(viewportStruct?.startLine).toBe(11);

    const renderEnum = symbols.find((s) => s.name === "RenderMode" && s.kind === "type");
    expect(renderEnum).toBeDefined();
    expect(renderEnum?.startLine).toBe(16);

    const initFn = symbols.find((s) => s.name === "initializeGraphics" && s.kind === "function");
    expect(initFn).toBeDefined();
    expect(initFn?.startLine).toBe(21);
    expect(initFn?.confidence).toBe("ast");
  });

  it("extracts Kotlin data classes, interfaces, enums, objects, and functions", async () => {
    const kotlinCode = `package com.example.service

data class UserDto(val id: String, val name: String)

interface UserService {
    fun findById(id: String): UserDto?
}

enum class Priority { HIGH, LOW }

object ServiceRegistry {
    fun getService(): UserService? = null
}
`;

    const symbols = await extractSymbols("src/UserService.kt", kotlinCode, "Kotlin");
    expect(symbols.length).toBeGreaterThanOrEqual(4);

    const dataClass = symbols.find((s) => s.name === "UserDto" && s.kind === "class");
    expect(dataClass).toBeDefined();
    expect(dataClass?.confidence).toBe("ast");

    const iface = symbols.find((s) => s.name === "UserService" && s.kind === "interface");
    expect(iface).toBeDefined();
    expect(iface?.confidence).toBe("ast");

    const enumSym = symbols.find((s) => s.name === "Priority" && s.kind === "type");
    expect(enumSym).toBeDefined();

    const objSym = symbols.find((s) => s.name === "ServiceRegistry" && s.kind === "class");
    expect(objSym).toBeDefined();
  });

  it("extracts Java symbols synchronously using heuristic fallback", () => {
    const javaCode = `public class OrderService {
    public OrderService() {}
    public void processOrder() {}
}
public interface OrderValidator {}
public enum OrderState { NEW, DONE }
`;
    const symbols = extractSymbolsSync("OrderService.java", javaCode, "Java");
    expect(symbols.some((s) => s.name === "OrderService" && s.kind === "class")).toBe(true);
    expect(symbols.some((s) => s.name === "OrderValidator" && s.kind === "interface")).toBe(true);
    expect(symbols.some((s) => s.name === "OrderState" && s.kind === "type")).toBe(true);
    expect(symbols.some((s) => s.name === "processOrder" && s.kind === "method")).toBe(true);
  });
});

describe("Task 1: Java Framework Detection & Entry Points in ArchitectureAnalyzer", () => {
  it("detects Spring Boot framework and entry point with @SpringBootApplication and main()", () => {
    const files: RepositoryFile[] = [
      {
        path: "pom.xml",
        size: 1200,
        type: "blob",
        sha: "pom123",
        isBinary: false,
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>`
      },
      {
        path: "src/main/java/com/example/demo/DemoApplication.java",
        size: 450,
        type: "blob",
        sha: "demo123",
        language: "Java",
        isBinary: false,
        content: `package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}`
      },
      {
        path: "src/main/java/com/example/demo/controller/UserController.java",
        size: 800,
        type: "blob",
        sha: "user123",
        language: "Java",
        isBinary: false
      }
    ];

    const summary = ArchitectureAnalyzer.analyze(files);

    expect(summary.detectedFrameworks).toContain("Spring Boot");
    expect(summary.detectedFrameworks).toContain("Spring");
    expect(summary.entryPoints).toContain("src/main/java/com/example/demo/DemoApplication.java");
    expect(summary.manifestFiles).toContain("pom.xml");
    expect(summary.primaryLanguage).toBe("Java");
  });

  it("detects Spring Boot from build.gradle and Gradle manifest", () => {
    const files: RepositoryFile[] = [
      {
        path: "build.gradle",
        size: 900,
        type: "blob",
        sha: "gradle123",
        isBinary: false,
        content: `plugins {
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
    id 'java'
}
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
}`
      },
      {
        path: "src/main/java/com/company/service/MainApplication.java",
        size: 300,
        type: "blob",
        sha: "main123",
        language: "Java",
        isBinary: false,
        content: `package com.company.service;

@SpringBootApplication
public class MainApplication {
    public static void main(String[] args) {}
}`
      }
    ];

    const summary = ArchitectureAnalyzer.analyze(files);
    expect(summary.detectedFrameworks).toContain("Spring Boot");
    expect(summary.entryPoints).toContain("src/main/java/com/company/service/MainApplication.java");
    expect(summary.manifestFiles).toContain("build.gradle");
  });
});
