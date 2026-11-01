"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Save,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  ArrowLeft,
  Key,
  Globe,
  Trash2,
  Sliders
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { clientFetch } from "@/lib/api";

type ProviderMode = "ollama" | "openai-compatible" | "offline";

export default function AISettingsPage() {
  const { aiConfig, setAiConfig } = useRepository();

  // Mode selection
  const [activeMode, setActiveMode] = useState<ProviderMode>("ollama");

  // Local Ollama states
  const [ollamaUrl, setOllamaUrl] = useState(aiConfig.baseUrl || "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(aiConfig.modelName || "qwen2.5-coder:1.5b");
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    isAvailable: boolean;
    models: string[];
    error?: string;
  } | null>(null);

  // BYO Key states (sessionStorage ONLY)
  const [byoBaseUrl, setByoBaseUrl] = useState("https://api.openai.com/v1");
  const [byoKey, setByoKey] = useState("");
  const [byoModel, setByoModel] = useState("gpt-4o-mini");
  const [testingByo, setTestingByo] = useState(false);
  const [byoStatus, setByoStatus] = useState<{
    isAvailable: boolean;
    models: string[];
    error?: string;
  } | null>(null);

  const [copiedCmd, setCopiedCmd] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const savedMode = sessionStorage.getItem("REPOPILOT_AI_PROVIDER") as ProviderMode;
      if (savedMode) setActiveMode(savedMode);

      const savedKey = sessionStorage.getItem("REPOPILOT_BYO_AI_KEY");
      if (savedKey) setByoKey(savedKey);

      const savedBaseUrl = sessionStorage.getItem("REPOPILOT_BYO_AI_BASE_URL");
      if (savedBaseUrl) setByoBaseUrl(savedBaseUrl);

      const savedModel = sessionStorage.getItem("REPOPILOT_BYO_AI_MODEL");
      if (savedModel) setByoModel(savedModel);
    } catch {}

    testOllama();
  }, []);

  const testOllama = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const res = await fetch(`/api/ai/capabilities?ollamaUrl=${encodeURIComponent(ollamaUrl)}`);
      const data = await res.json();
      const ollamaData = data.providers?.ollama;
      setOllamaStatus({
        isAvailable: Boolean(ollamaData?.available),
        models: ollamaData?.models || [],
        error: ollamaData?.error
      });
    } catch {
      setOllamaStatus({
        isAvailable: false,
        models: [],
        error: "Could not reach local Ollama endpoint."
      });
    } finally {
      setTestingOllama(false);
    }
  };

  const testByoKey = async () => {
    if (!byoKey.trim()) {
      setByoStatus({
        isAvailable: false,
        models: [],
        error: "Please enter your API key first."
      });
      return;
    }

    setTestingByo(true);
    setByoStatus(null);
    try {
      const res = await fetch("/api/ai/capabilities", {
        headers: {
          "x-ai-key": byoKey.trim(),
          "x-ai-base-url": byoBaseUrl.trim()
        }
      });
      const data = await res.json();
      const customData = data.providers?.["openai-compatible"];
      setByoStatus({
        isAvailable: Boolean(customData?.available),
        models: customData?.models || [],
        error: customData?.error
      });

      if (customData?.available) {
        // Save to sessionStorage ONLY
        sessionStorage.setItem("REPOPILOT_BYO_AI_KEY", byoKey.trim());
        sessionStorage.setItem("REPOPILOT_BYO_AI_BASE_URL", byoBaseUrl.trim());
        sessionStorage.setItem("REPOPILOT_BYO_AI_MODEL", byoModel.trim());
        sessionStorage.setItem("REPOPILOT_AI_PROVIDER", "openai-compatible");
        setActiveMode("openai-compatible");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e: any) {
      setByoStatus({
        isAvailable: false,
        models: [],
        error: e.message || "Failed to validate custom API key."
      });
    } finally {
      setTestingByo(false);
    }
  };

  const saveOllamaSettings = () => {
    sessionStorage.setItem("REPOPILOT_AI_PROVIDER", "ollama");
    setActiveMode("ollama");
    const updated = {
      ...aiConfig,
      baseUrl: ollamaUrl,
      modelName: ollamaModel
    };
    setAiConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    testOllama();
  };

  const setOfflineMode = () => {
    sessionStorage.setItem("REPOPILOT_AI_PROVIDER", "offline");
    setActiveMode("offline");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const clearByoKey = () => {
    sessionStorage.removeItem("REPOPILOT_BYO_AI_KEY");
    sessionStorage.removeItem("REPOPILOT_BYO_AI_BASE_URL");
    sessionStorage.removeItem("REPOPILOT_BYO_AI_MODEL");
    setByoKey("");
    setByoStatus(null);
    setActiveMode("ollama");
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="text-xs font-mono text-theme-text-muted hover:text-theme-text flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Settings
            </Link>
            <span className="text-theme-text-muted">/</span>
            <span className="text-xs font-mono text-theme-text">AI Provider</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-theme-text">
            AI Provider & Neural Reasoning Configuration
          </h1>
          <p className="text-xs text-theme-text-muted mt-1 max-w-xl">
            Choose how RepoPilot runs grounded AI investigations: completely free via local Ollama,
            bring your own OpenAI-compatible API key, or offline deterministic mode.
          </p>
        </div>

        {/* Global Active Badge */}
        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted">
            Active Provider Mode
          </span>
          {activeMode === "openai-compatible" ? (
            <Badge variant="success" className="px-3 py-1 font-mono text-xs">
              AI: Your API Key
            </Badge>
          ) : activeMode === "ollama" && ollamaStatus?.isAvailable ? (
            <Badge variant="primary" className="px-3 py-1 font-mono text-xs">
              AI: Local Ollama
            </Badge>
          ) : (
            <Badge variant="neutral" className="px-3 py-1 font-mono text-xs">
              AI: Offline (Deterministic Only)
            </Badge>
          )}
        </div>
      </div>

      {/* Mode Explanation Banner */}
      <div className="p-4 rounded-xl bg-theme-surface border border-theme-border flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-theme-blue shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-theme-text">
            {activeMode === "openai-compatible" && "Mode: Hosted API (BYO Key) — Neural synthesis via your configured endpoint."}
            {activeMode === "ollama" && "Mode: Local Ollama (₹0 / $0) — Zero API costs; inference runs entirely on your local machine."}
            {activeMode === "offline" && "Mode: Offline Deterministic — AST symbol parsing, keyword search, and Mermaid diagram generation with verified citations."}
          </p>
          <p className="text-theme-text-muted">
            All repository exploration, search, and architecture analysis work with no AI required.
            Your API keys are stored <strong>strictly in sessionStorage</strong> and never touch any database or server storage.
          </p>
        </div>
      </div>

      {/* Choose Your AI Setup Panel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-theme-text flex items-center gap-2">
              <Cpu className="w-4 h-4 text-theme-blue" />
              Choose Your AI Setup
            </h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Select how RepoPilot runs grounded reasoning. Match your hardware capacity, privacy requirements, or zero-AI preference.
            </p>
          </div>
          <Badge
            variant={activeMode === "openai-compatible" ? "success" : activeMode === "ollama" ? "primary" : "neutral"}
            className="font-mono text-xs w-fit"
          >
            Active: {activeMode === "openai-compatible" ? "Bring-Your-Own Key" : activeMode === "ollama" ? "Local Ollama" : "Offline Mode"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Local Ollama */}
          <div
            onClick={() => setActiveMode("ollama")}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              activeMode === "ollama"
                ? "bg-theme-surface-alt border-theme-blue ring-2 ring-theme-blue/30 shadow-sm"
                : "bg-theme-surface border-theme-border hover:border-theme-border"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-theme-blue" />
                  Local Ollama
                </span>
                <Badge variant="primary" className="text-[10px] font-mono">Private · Free</Badge>
              </div>
              <p className="text-xs text-theme-text-muted mb-3 leading-relaxed">
                Runs open-weights models directly on your hardware. Complete privacy with zero cloud fees.
              </p>
              <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1.5 text-[11px] font-mono">
                <div className="text-theme-blue font-semibold flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Hardware Guidance:
                </div>
                <div className="text-theme-text">
                  • <strong>16 GB RAM</strong>: Recommend <strong>7B model</strong> (e.g. <code>qwen2.5-coder:7b</code>)
                </div>
                <div className="text-theme-text">
                  • <strong>8 GB RAM</strong>: Recommend <strong>1.5B model</strong> (e.g. <code>qwen2.5-coder:1.5b</code>)
                </div>
                <div className="text-[10px] text-amber-400/90 pt-0.5">
                  ⚠️ Hardware limited: inference speed and multi-file reasoning capacity depend on your local hardware.
                </div>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs font-mono">
              <span className="text-theme-text-muted">Provider Cost:</span>
              <span className="text-theme-green font-semibold">₹0 / $0 (Always Free)</span>
            </div>
          </div>

          {/* 2. Bring Your Own Key */}
          <div
            onClick={() => setActiveMode("openai-compatible")}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              activeMode === "openai-compatible"
                ? "bg-theme-surface-alt border-theme-blue ring-2 ring-theme-blue/30 shadow-sm"
                : "bg-theme-surface border-theme-border hover:border-theme-border"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-theme-blue" />
                  Bring-Your-Own Key
                </span>
                <Badge variant="success" className="text-[10px] font-mono">Best Quality</Badge>
              </div>
              <p className="text-xs text-theme-text-muted mb-3 leading-relaxed">
                Connect OpenAI, Groq, OpenRouter, or DeepSeek. Best quality and multi-file context synthesis.
              </p>
              <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1.5 text-[11px] font-mono">
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Provider Limits & Security:
                </div>
                <div className="text-theme-text">
                  • Keys kept <strong>strictly in browser sessionStorage</strong>
                </div>
                <div className="text-theme-text">
                  • Never saved to disk, server logs, or databases
                </div>
                <div className="text-[10px] text-amber-400/90 pt-0.5">
                  ⚠️ Provider limits & per-token usage costs apply.
                </div>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs font-mono">
              <span className="text-theme-text-muted">Provider Cost:</span>
              <span className="text-theme-text-muted font-semibold">Provider Rates</span>
            </div>
          </div>

          {/* 3. Offline Mode */}
          <div
            onClick={setOfflineMode}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              activeMode === "offline"
                ? "bg-theme-surface-alt border-theme-blue ring-2 ring-theme-blue/30 shadow-sm"
                : "bg-theme-surface border-theme-border hover:border-theme-border"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-theme-blue" />
                  Offline Mode
                </span>
                <Badge variant="neutral" className="text-[10px] font-mono">Always Works</Badge>
              </div>
              <p className="text-xs text-theme-text-muted mb-3 leading-relaxed">
                Deterministic keyword and AST symbol search. Zero AI models, zero cloud APIs, zero setup needed.
              </p>
              <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1.5 text-[11px] font-mono">
                <div className="text-theme-text font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-theme-green" />
                  Operational Guarantee:
                </div>
                <div className="text-theme-text">
                  • Instant query latency (&lt; 5 ms)
                </div>
                <div className="text-theme-text">
                  • Tree-sitter AST symbol extraction & lexical ranking
                </div>
                <div className="text-[10px] text-theme-text-muted pt-0.5">
                  ✓ Always works, even in air-gapped environments.
                </div>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs font-mono">
              <span className="text-theme-text-muted">Provider Cost:</span>
              <span className="text-theme-green font-semibold">₹0 / $0 (Always Free)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Details Section */}
      {activeMode === "openai-compatible" && (
        <Card className="p-6 space-y-6 bg-theme-surface border-theme-border">
          <div>
            <h2 className="text-base font-semibold text-theme-text flex items-center gap-2">
              <Globe className="w-4 h-4 text-theme-blue" />
              OpenAI-Compatible Provider (Bring Your Own Key)
            </h2>
            <p className="text-xs text-theme-text-muted mt-1">
              Enables neural synthesis on the public Vercel deployment. Enter your credentials below.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-theme-text block mb-1.5">
                Endpoint Base URL
              </label>
              <Input
                value={byoBaseUrl}
                onChange={(e) => setByoBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-theme-text-muted mt-1">
                Examples: <code>https://api.openai.com/v1</code>, <code>https://api.groq.com/openai/v1</code>, <code>https://openrouter.ai/api/v1</code>
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-theme-text block mb-1.5">
                API Key (Stored in sessionStorage ONLY)
              </label>
              <Input
                type="password"
                value={byoKey}
                onChange={(e) => setByoKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-theme-text-muted mt-1">
                🔒 Security guarantee: Stored strictly in browser <code>sessionStorage</code>. Never persisted to databases, disk, or server logs.
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-theme-text block mb-1.5">
                Model Identifier
              </label>
              <Input
                value={byoModel}
                onChange={(e) => setByoModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-theme-text-muted mt-1">
                Examples: <code>gpt-4o-mini</code>, <code>llama-3.1-70b-versatile</code>, <code>deepseek-chat</code>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={testByoKey}
                disabled={testingByo}
                variant="primary"
                size="sm"
                className="gap-2"
              >
                {testingByo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Validate & Save Key in Session
              </Button>

              {byoKey && (
                <Button
                  onClick={clearByoKey}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-theme-danger hover:bg-linear-danger/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Key
                </Button>
              )}
            </div>

            {/* Validation Result */}
            {byoStatus && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-mono ${
                  byoStatus.isAvailable
                    ? "bg-linear-success/10 border-linear-success/30 text-theme-green"
                    : "bg-linear-danger/10 border-linear-danger/30 text-theme-danger"
                }`}
              >
                {byoStatus.isAvailable ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Connection successful! Active model: {byoModel}. Ready for exploration.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Connection failed: {byoStatus.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeMode === "ollama" && (
        <Card className="p-6 space-y-6 bg-theme-surface border-theme-border">
          <div>
            <h2 className="text-base font-semibold text-theme-text flex items-center gap-2">
              <Laptop className="w-4 h-4 text-theme-blue" />
              Local Ollama Daemon Configuration
            </h2>
            <p className="text-xs text-theme-text-muted mt-1">
              Connect to your local workstation daemon. Completely free with zero cloud fees.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-theme-text block mb-1.5">
                Local Ollama URL
              </label>
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-theme-text block mb-1.5">
                Model Name
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setOllamaModel("qwen2.5-coder:7b")}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                    ollamaModel === "qwen2.5-coder:7b"
                      ? "bg-theme-blue/20 border-theme-blue text-theme-blue"
                      : "bg-theme-surface-alt border-theme-border text-theme-text-muted hover:text-white"
                  }`}
                >
                  qwen2.5-coder:7b (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setOllamaModel("qwen2.5-coder:1.5b")}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                    ollamaModel === "qwen2.5-coder:1.5b"
                      ? "bg-theme-blue/20 border-theme-blue text-theme-blue"
                      : "bg-theme-surface-alt border-theme-border text-theme-text-muted hover:text-white"
                  }`}
                >
                  qwen2.5-coder:1.5b (Fast / Low RAM)
                </button>
              </div>
              <Input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="qwen2.5-coder:7b"
                className="font-mono text-xs"
              />
            </div>

            {/(1\.5b|0\.5b|1b|3b)/i.test(ollamaModel) && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Quality Notice:</strong> Models under 7B (such as 1.5B) have limited multi-file reasoning capacity and may miss subtle references. A 7B-class model (e.g. <code>qwen2.5-coder:7b</code>) is recommended for production-grade code Q&A.
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={saveOllamaSettings}
                disabled={testingOllama}
                variant="primary"
                size="sm"
                className="gap-2"
              >
                {testingOllama ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Test & Save Settings
              </Button>
            </div>

            {/* Ollama Status */}
            {ollamaStatus && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-mono ${
                  ollamaStatus.isAvailable
                    ? "bg-linear-success/10 border-linear-success/30 text-theme-green"
                    : "bg-theme-surface-alt border-theme-border text-theme-text-muted"
                }`}
              >
                {ollamaStatus.isAvailable ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-theme-green">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Connected to Ollama. Detected {ollamaStatus.models.length} local model(s).</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-theme-text-muted">
                    <div className="flex items-center gap-2 text-theme-warning-text font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Ollama not detected at {ollamaUrl}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      On the public Vercel deployment, local Ollama is only reachable if you run the app locally.
                      To run local inference on your computer, start Ollama:
                    </p>
                    <div className="flex items-center justify-between p-2 rounded bg-theme-surface-alt border border-theme-border font-mono text-xs">
                      <code>ollama run {ollamaModel}</code>
                      <button
                        type="button"
                        onClick={() => copyCommand(`ollama run ${ollamaModel}`)}
                        className="text-theme-text-muted hover:text-white"
                      >
                        {copiedCmd ? <Check className="w-3.5 h-3.5 text-theme-green" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
