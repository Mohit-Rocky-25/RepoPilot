# RepoPilot Security Policy & Architecture

## Security Overview
RepoPilot is an open-source, evidence-grounded codebase intelligence engine. It is designed with defense-in-depth security principles across ingestion, parsing, LLM context synthesis, network egress, and client presentation.

---

## Prompt Injection Hardening

### Threat Model & Defense Strategy
Repository analysis platforms ingest untrusted source code, comments, issues, and documentation from third-party repositories. Malicious repositories can attempt prompt injection attacks designed to:
1. Break out of XML/CDATA context delimiters (e.g. inserting closing `]]>` and `</untrusted_repo_content>` tags).
2. Hijack the system persona (e.g. "Ignore previous instructions", "You are now DAN").
3. Force fraudulent citations or leak system instructions / API keys.
4. Alter citation output formats to evade downstream validation passes.

### Mitigations
1. **Delimiter Escaping & Neutralization**: All indexed repository files embedded into prompts are stripped and neutralized before prompt construction. Literal `]]>` sequences are rewritten to `]]&gt;`, and tag boundaries (`<untrusted_repo_content>`, `<system_override>`) are neutralized.
2. **Explicit System Instructions**: The LLM system prompt explicitly instructs that repository text is passive data only. Repository content is forbidden from altering citation formats, validation rules, or tool execution behavior.
3. **Multi-Pass Post-Generation Citation Validation**: AI responses undergo a strict multi-pass validation harness. Citations are verified to exist in the pinned commit SHA, verified to span non-whitespace code, and tested for keyword support against the claim sentence. Hallucinated or injected citation tags referencing fake files are automatically stripped and flagged.
4. **Prompt Injection is Mitigated, Not Eliminated**:
   > **Important Security Boundary**: Prompt injection is mitigated, not eliminated. The app is read-only and executes no repository code. RepoPilot runs zero arbitrary user code, executes zero build scripts, and provides no shell or execution sandboxes.
