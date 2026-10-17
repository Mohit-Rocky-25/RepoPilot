const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Output paths: respect OUTPUT_DIR env var or default to project root
const outputDir = process.env.OUTPUT_DIR || path.resolve(__dirname, '..');
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, 'RepoPilot_README_Documentation.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 40, right: 40 },
  bufferPages: true
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Colors
const PRIMARY = '#5E6AD2';
const PRIMARY_DARK = '#3A4499';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#334155';
const TEXT_SUBTLE = '#64748B';
const BG_BOX = '#F8FAFC';
const BG_ALT = '#F1F5F9';
const BORDER_BOX = '#CBD5E1';

function drawTopAccent() {
  doc.rect(40, 35, doc.page.width - 80, 3.5).fill(PRIMARY);
  doc.moveDown(0.6);
}

function checkPage(neededHeight = 60) {
  if (doc.y + neededHeight > doc.page.height - 45) {
    doc.addPage();
    drawTopAccent();
  }
}

function addTitle(title, subtitle) {
  checkPage(80);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(PRIMARY_DARK).text(title, { align: 'left' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(10.5).fillColor(TEXT_MUTED).text(subtitle, { align: 'left' });
  }
  doc.moveDown(0.4);
  doc.strokeColor(BORDER_BOX).lineWidth(0.8).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.6);
}

function addSection(title) {
  checkPage(70);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(PRIMARY_DARK).text(title);
  doc.strokeColor(PRIMARY).lineWidth(1.2).moveTo(40, doc.y + 2).lineTo(180, doc.y + 2).stroke();
  doc.moveDown(0.5);
}

function addSubSection(title) {
  checkPage(50);
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT_MAIN).text(title);
  doc.moveDown(0.25);
}

function addParagraph(text) {
  checkPage(40);
  doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED).lineGap(2.2).text(text);
  doc.moveDown(0.35);
}

function addBullet(boldText, normalText) {
  checkPage(35);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_MAIN).text('- ' + boldText + (boldText ? ': ' : ''), { continued: !!normalText });
  if (normalText) {
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED).lineGap(2).text(normalText);
  }
  doc.moveDown(0.2);
}

function addCodeBox(title, code) {
  const width = doc.page.width - 80;
  doc.font('Courier').fontSize(7.5);
  const textHeight = doc.heightOfString(code, { width: width - 16, lineGap: 1.2 });
  const totalHeight = textHeight + (title ? 24 : 14);

  if (doc.y + totalHeight > doc.page.height - 45) {
    doc.addPage();
    drawTopAccent();
  }

  const startY = doc.y;
  doc.roundedRect(40, startY, width, totalHeight, 4).fill(BG_BOX);
  doc.roundedRect(40, startY, width, totalHeight, 4).strokeColor(BORDER_BOX).lineWidth(0.8).stroke();

  let textStartY = startY + 7;
  if (title) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(PRIMARY_DARK).text(title, 48, startY + 5);
    doc.strokeColor(BORDER_BOX).lineWidth(0.5).moveTo(40, startY + 17).lineTo(40 + width, startY + 17).stroke();
    textStartY = startY + 22;
  }

  doc.font('Courier').fontSize(7.2).fillColor(TEXT_MAIN).lineGap(1.2).text(code, 48, textStartY, { width: width - 16 });
  doc.y = startY + totalHeight + 6;
}

function addTable(headers, rows, colWidths) {
  checkPage(50);
  const startX = 40;
  const tableWidth = doc.page.width - 80;

  // Header
  let currentY = doc.y;
  doc.rect(startX, currentY, tableWidth, 18).fill('#EEF2FF');
  doc.rect(startX, currentY, tableWidth, 18).strokeColor(BORDER_BOX).lineWidth(0.8).stroke();

  let curX = startX + 6;
  doc.font('Helvetica-Bold').fontSize(7.8).fillColor(PRIMARY_DARK);
  headers.forEach((h, i) => {
    doc.text(h, curX, currentY + 5, { width: colWidths[i] - 10 });
    curX += colWidths[i];
  });
  currentY += 18;

  // Rows
  rows.forEach((row, rowIndex) => {
    doc.font('Helvetica').fontSize(7.5);
    let maxRowHeight = 16;
    row.forEach((cell, i) => {
      const h = doc.heightOfString(cell, { width: colWidths[i] - 10, lineGap: 1.2 }) + 8;
      if (h > maxRowHeight) maxRowHeight = h;
    });

    if (currentY + maxRowHeight > doc.page.height - 45) {
      doc.addPage();
      drawTopAccent();
      currentY = doc.y;

      // Repeat header on new page
      doc.rect(startX, currentY, tableWidth, 18).fill('#EEF2FF');
      doc.rect(startX, currentY, tableWidth, 18).strokeColor(BORDER_BOX).lineWidth(0.8).stroke();
      let repX = startX + 6;
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(PRIMARY_DARK);
      headers.forEach((h, i) => {
        doc.text(h, repX, currentY + 5, { width: colWidths[i] - 10 });
        repX += colWidths[i];
      });
      currentY += 18;
    }

    if (rowIndex % 2 === 1) {
      doc.rect(startX, currentY, tableWidth, maxRowHeight).fill(BG_BOX);
    }
    doc.rect(startX, currentY, tableWidth, maxRowHeight).strokeColor(BORDER_BOX).lineWidth(0.5).stroke();

    let cellX = startX + 6;
    row.forEach((cell, i) => {
      const isBold = (i === 0);
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(7.5)
         .fillColor(isBold ? TEXT_MAIN : TEXT_MUTED)
         .text(cell, cellX, currentY + 4, { width: colWidths[i] - 10, lineGap: 1.2 });
      cellX += colWidths[i];
    });

    currentY += maxRowHeight;
  });

  doc.y = currentY + 8;
}

// ================= PAGE 1 =================
drawTopAccent();
addTitle('RepoPilot -- Official Project Documentation', 'Open-Source Codebase Intelligence, Architecture & Evidence-Grounded Debugging Platform');

// Info Card
const infoBoxY = doc.y;
doc.roundedRect(40, infoBoxY, doc.page.width - 80, 50, 4).fill('#EEF2FF');
doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PRIMARY_DARK).text('OFFICIAL VERIFIED DEPLOYMENT & REPOSITORY METRICS', 50, infoBoxY + 6);
doc.font('Helvetica').fontSize(8).fillColor(TEXT_MAIN)
   .text('[Live Demo] Production Deployment: https://repo-pilot-git.vercel.app', 50, infoBoxY + 18)
   .text('[Source] GitHub Repository: https://github.com/Mohit-Rocky-25/RepoPilot', 50, infoBoxY + 28)
   .text('[Stack] Next.js 14 App Router, TypeScript (Strict), Three.js 3D, Tree-sitter WASM, Local Ollama ($0 API Spend)', 50, infoBoxY + 38);
doc.y = infoBoxY + 58;

addSection('1. What is RepoPilot?');
addParagraph('RepoPilot is an independent, open-source codebase intelligence and developer productivity platform. It enables software engineers, first-time open-source contributors, and researchers to explore, understand, and debug unfamiliar repositories with precision.');
addParagraph('Entering an unfamiliar software codebase is one of the most time-consuming activities in engineering. Developers spend a substantial portion of their daily working time reading existing code, deciphering architectural scaffolding, and locating the source of runtime errors before writing new logic. Most existing developer tools either rely on expensive cloud LLM subscriptions that can hallucinate non-existent files and symbols, or provide basic file trees without architectural context.');
addParagraph('RepoPilot solves this through an evidence-first engineering approach:');
addBullet('Deterministic Core', 'File navigation, AST symbol extraction, architecture detection, and ranked code search run entirely on local compute without requiring an AI model or cloud API.');
addBullet('Traceable Citations', 'Every analysis, symbol jump, and assistant answer is tied to an immutable commit SHA, exact file path, and line coordinate.');
addBullet('Optional Private AI', 'Supports local open-weights coding models via Ollama (e.g., qwen2.5-coder:7b) or user-supplied OpenAI-compatible API keys (sessionStorage only) with strict token bounds and automated citation verification. Operates 100% offline when AI is unavailable.');
addBullet('Defensive Sandboxing', 'Untrusted repository code is never executed automatically. Bug fixes are proposed as unified diffs validated in memory against pinned file lines with reproducible regression tests for human review.');

addSection('2. Key Capabilities & Implementation Status');
const capHeaders = ['Feature Area', 'Description', 'Status', 'No Key Demo?', 'Data Source'];
const capRows = [
  ['Repository Ingestion', 'Ingests public GitHub repos via streaming tarball, validates URLs against SSRF, pins commit SHA.', 'Stable', 'Yes', 'GitHub Tarball / REST API'],
  ['Code Explorer', 'Resizable dual-pane tree and syntax-highlighted code viewer with line coordinates.', 'Stable', 'Yes', 'Extracted files (<100KB)'],
  ['Deterministic Search', 'Multi-modal search ranking BM25 lexical matches, paths, entry points, and symbols.', 'Stable', 'Yes', 'In-memory search engine'],
  ['AST Symbol Extraction', 'Real Tree-sitter WASM grammars (TS/JS/Py/Go/Rust) with heuristic regex fallback.', 'Beta', 'Yes', 'Tree-sitter WASM / regex'],
  ['Architecture Map', 'Interactive 2D graph (default) with optional WebGL 3D orbital perspective map.', 'Beta', 'Yes', 'Manifest analysis & imports'],
  ['Architecture Brief', 'Summarizes detected frameworks, confirmed application entry points, and directory roles.', 'Stable', 'Yes', 'Manifest inspection'],
  ['Grounded Code AI', 'Conversational assistant with bounded context and strict citation verification against pinned SHA.', 'Beta', 'Yes (Offline)', 'Ollama / BYO Key / Offline'],
  ['Bug & Stack Analyzer', 'Multi-language parser (Node/V8, Python chained, Go, Rust) with ANSI stripping and 64KB cap.', 'Beta', 'Yes', 'Stack frame parser & engine'],
  ['Patch Review & PR', 'Unified diffs validated in memory against pinned files; "Unverified: review before applying".', 'Beta', 'Yes', 'In-memory diff validator'],
  ['Rate Limit Mgmt', 'Platform-trusted IP derivation, Upstash Redis support with in-memory fallback, session PAT.', 'Stable', 'Yes', 'Platform headers & store']
];
addTable(capHeaders, capRows, [95, 175, 55, 65, 125]);

// ================= PAGE 2 =================
checkPage(120);
addSection('3. Representative Use Cases');
addBullet('First-Time Open-Source Contributors', 'Quickly locate application entry points, configuration schemas, and test directories in unfamiliar repositories to understand where a bug fix or feature belongs.');
addBullet('Engineers Joining a New Codebase', 'Survey dependencies, module hierarchies, and architecture briefs within seconds without waiting for bulky IDE background indexing tasks.');
addBullet('Production Incident & Bug Triage', 'Paste an error log or stack trace from CI or production to isolate user-code frames, pinpoint root causes, and draft candidate minimal unified diffs.');
addBullet('Privacy-Conscious Developers & Students', 'Explore and query codebases on local hardware without paying subscription fees or sending proprietary source code to hosted cloud APIs.');

addSection('4. How RepoPilot Works');
addParagraph('RepoPilot operates via a 6-stage evidence pipeline:');
addBullet('1. Ingest & Pin Revision', 'Validates repository URL against SSRF policy, downloads single gzipped tarball from codeload.github.com, and resolves default branch HEAD to an immutable commit SHA.');
addBullet('2. Filter & Index', 'Excludes binaries, build artifacts (node_modules/, dist/), and files over 100KB. Supported files are indexed for AST symbols via Tree-sitter WASM.');
addBullet('3. Map Architecture', 'Manifest files (package.json, Cargo.toml, pyproject.toml, go.mod) are parsed to detect frameworks and map module directory roles.');
addBullet('4. Search & Browse', 'Users navigate directory trees, search symbols with multi-factor BM25 ranking, and inspect code with line-level coordinates.');
addBullet('5. Contextual Q&A', 'Questions are matched against indexed source files, bounded to 4,000 tokens, and passed to local Ollama or BYO key. Citations returned are strictly verified against indexed files.');
addBullet('6. Investigate & Review', 'Runtime stack traces are parsed into structured frames, correlated with source files, and translated into ranked hypotheses and in-memory validated diffs for human review.');

addCodeBox('SYSTEM ARCHITECTURE DATA FLOW',
`Public GitHub URL --> SSRF Safety Validation --> Resolve & Pin Commit SHA
                                                |
              +---------------------------------+-------------------------------+
              |                                 |                               |
      File Tree & Viewer             Tree-sitter WASM AST           Manifest Architecture Detector
              |                                 |                               |
              |                                 v                               v
              |                        Ranked Search Engine          2D / 3D Spatial Visualizer
              |                                 |                               |
              +------------------------+--------+-------------------------------+
                                       v
                              Bounded Context RAG
                                       |
                         +-------------+-------------+
                         v                           v
             Local Ollama / BYO Key          Offline Fallback
                         |                           |
                         v                           |
             Strict Citation Verifier                |
                         +-------------+-------------+
                                       v
                           Grounded Code Intelligence`);

// ================= PAGE 3 =================
checkPage(120);
addSection('5. Architecture & Design Decisions');
addSubSection('A. Modular Monolith Architecture');
addParagraph('RepoPilot packages adhere to strict Zod validation contracts:');
addBullet('@repopilot/core', 'Shared schemas (RepositoryReference, SourceReference, BugHypothesis, PatchProposal).');
addBullet('@repopilot/github', 'GitHub client with rate-limit tracking, tarball extraction, and commit revision pinning.');
addBullet('@repopilot/indexer', 'Multi-language Tree-sitter WASM symbol extraction engine.');
addBullet('@repopilot/search', 'Multi-factor BM25 and symbol ranking search engine.');
addBullet('@repopilot/analysis', 'Framework detection and directory role heuristics.');
addBullet('@repopilot/ai', 'ModelProvider abstraction (Ollama, BYO OpenAI-compatible, Offline) and citation verification.');
addBullet('@repopilot/debugging', 'Multi-language stack trace parser and in-memory diff validator.');
addBullet('@repopilot/execution', 'Execution safety policies and reproducible manual instructions.');

addSubSection('B. Why Deterministic Tools Precede AI');
addParagraph('AI models can hallucinate non-existent files, misquote syntax, or generate plausible-sounding errors. In RepoPilot, deterministic AST indexing, file tree navigation, and keyword search function completely independently of AI. AI is treated as an optional interpretive layer, never a prerequisite for basic navigation.');

addSubSection('C. Human-in-the-Loop Patch Policy');
addParagraph('RepoPilot adheres to strict developer safety standards:');
addBullet('Zero Remote Mutation', 'It never applies patches automatically to local or remote repositories.');
addBullet('Zero Arbitrary Execution', 'It never runs arbitrary build or test scripts on the server.');
addBullet('Human Verification', 'All candidate diffs are presented in unified diff view for manual inspection and local reproduction labeled "Unverified: review before applying".');

addSection('6. Honest Comparison Against Real Alternatives');
const compHeaders = ['Dimension', 'RepoPilot', 'DeepWiki', 'Sourcegraph', 'Cursor / Copilot'];
const compRows = [
  ['Setup', 'Zero setup (browser URL)', 'Web-based indexing', 'Enterprise self-host/cloud', 'IDE plugin config'],
  ['Privacy', 'Local / sessionStorage keys', 'Cloud-hosted index', 'Enterprise on-prem/cloud', 'Cloud-hosted telemetry'],
  ['Offline Core', 'Full offline core', 'No (hosted platform)', 'No (server required)', 'Partial (editor only)'],
  ['Citations', 'Strict SHA verification', 'Document-level links', 'Compiler-grade SCIP graph', 'None (inline editor)'],
  ['Cost', '$0 / Free forever', 'Freemium / Subscription', 'Free tier / Enterprise $$$', '$10-$20/mo per seat'],
  ['Scope Limits', 'Public repos <= 25MB', 'Public & private repos', 'Multi-repo enterprise', 'Workspace indexing']
];
addTable(compHeaders, compRows, [75, 110, 105, 115, 110]);

addParagraph('Where RepoPilot is Weaker: No private repo OAuth; single-repo scope (no multi-repo cross-codebase linking); repository size bounds (25MB archive / 1,500 files); small local models (<7B) have less reasoning power than frontier cloud models; serverless rate limiting without Redis is best-effort.');

// ================= PAGE 4 =================
checkPage(120);
addSection('7. Technology Stack');
addBullet('Framework', 'Next.js 14 (App Router, React Server Components, Route Handlers)');
addBullet('Language', 'TypeScript 5 (Strict Mode enabled with 0 errors)');
addBullet('UI & Layout', 'React 18, Tailwind CSS tokens & Vanilla CSS components');
addBullet('Data Validation', 'Zod 3 (Strict runtime contract validation across all API routes)');
addBullet('3D Visualization', 'Three.js WebGL canvas and SVG-sanitized Mermaid architecture engine');
addBullet('Testing', 'Vitest 2 (Unit, integration, and security suites, 95 tests passing across 14 files)');
addBullet('Local AI Daemon', 'Ollama (Optional, supports qwen2.5-coder:7b, qwen2.5-coder:1.5b, etc.)');

addSection('8. Quick Start & Setup Guide');
addCodeBox('GETTING STARTED LOCALLY',
`# 1. Clone the repository
git clone https://github.com/Mohit-Rocky-25/RepoPilot.git
cd RepoPilot

# 2. Install dependencies
npm install

# 3. Configure environment (Optional - safe defaults included out of the box)
cp .env.example .env.local

# 4. Start the development server
npm run dev

# Open http://localhost:3000 in your browser.`);

addSection('9. Development & Verification Commands');
addCodeBox('TESTING AND VERIFICATION SCRIPTS',
`# Run type checking (TypeScript Strict Mode)
npm run typecheck

# Run unit, integration, and security test suites (95 tests across 14 files)
npm test

# Build production bundle
npm run build

# Start production server
npm start`);

addSection('10. Security, Privacy & Known Limitations');
addParagraph('RepoPilot was hardened following an exhaustive production application security audit:');
addBullet('SSRF & Cloud Metadata Defense', 'Validates AI baseUrl and repo URLs. Strictly blocks 169.254.169.254, RFC1918 subnets, loopback, and IPv4-mapped IPv6.');
addBullet('Safe Tarball Ingestion', 'Enforces 25MB archive cap, 100KB per-file cap, symlink root containment, and path traversal rejection.');
addBullet('Rate Limiting & Abuse Prevention', 'Platform-trusted client IP extraction (x-vercel-forwarded-for), @upstash/ratelimit Redis support with in-memory fallback, 64KB body caps.');
addBullet('DOM-Based SVG XSS Defense', 'Mermaid architecture SVGs sanitized via DOMParser, stripping <script>, inline event handlers, and javascript: URIs.');
addBullet('Prompt Injection Hardening', 'Untrusted repository files isolated inside XML CDATA blocks (<untrusted_repo_content>).');
addBullet('Known Limitations', 'Public repos only; 25MB archive / 1,500 files cap; Tree-sitter AST for TS/JS/Py/Go/Rust (heuristic for others); models <7B require human review; best-effort rate limiting without Redis.');

// Footer on all pages
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_SUBTLE)
     .text(
       `RepoPilot Official Documentation  |  https://repo-pilot-git.vercel.app  |  Page ${i + 1} of ${totalPages}`,
       40,
       doc.page.height - 25,
       { align: 'center', width: doc.page.width - 80 }
     );
}

doc.end();

stream.on('finish', () => {
  console.log('README PDF successfully generated at: ' + outputPath);
  // Try copying to artifact dir if present
  try {
    const artifactPath = path.resolve('C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\14637422-dede-42dd-b02d-55cd133c52f5\\RepoPilot_README_Documentation.pdf');
    if (fs.existsSync(path.dirname(artifactPath))) {
      fs.copyFileSync(outputPath, artifactPath);
      console.log('README PDF copied to artifact path.');
    }
  } catch (err) {
    console.warn('Could not copy to artifact dir (non-fatal):', err.message);
  }
});
