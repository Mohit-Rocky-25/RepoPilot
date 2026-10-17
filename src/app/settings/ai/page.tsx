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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-linear-border-1 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="text-xs font-mono text-linear-text-muted hover:text-linear-text-main flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Settings
            </Link>
            <span className="text-linear-text-subtle">/</span>
            <span className="text-xs font-mono text-linear-text-secondary">AI Provider</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-linear-text-main">
            AI Provider & Neural Reasoning Configuration
          </h1>
          <p className="text-xs text-linear-text-muted mt-1 max-w-xl">
            Choose how RepoPilot runs grounded AI investigations: completely free via local Ollama,
            bring your own OpenAI-compatible API key, or 100% offline deterministic mode.
          </p>
        </div>

        {/* Global Active Badge */}
        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-linear-text-subtle">
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
      <div className="p-4 rounded-xl bg-linear-surface-1 border border-linear-border-1 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-linear-accent shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-linear-text-main">
            {activeMode === "openai-compatible" && "Mode: Hosted API (BYO Key) — Neural synthesis via your configured endpoint."}
            {activeMode === "ollama" && "Mode: Local Ollama (₹0 / $0) — Zero API costs; inference runs entirely on your local machine."}
            {activeMode === "offline" && "Mode: Offline Deterministic — AST symbol parsing, keyword search, and Mermaid diagram generation with verified citations."}
          </p>
          <p className="text-linear-text-muted">
            All repository exploration, search, and architecture analysis work with no AI required.
            Your API keys are stored <strong>strictly in sessionStorage</strong> and never touch any database or server storage.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setActiveMode("ollama")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeMode === "ollama"
              ? "bg-linear-surface-2 border-linear-accent ring-1 ring-linear-accent"
              : "bg-linear-surface-1 border-linear-border-1 hover:border-linear-border-2"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-linear-text-main flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-linear-accent" />
              1. Local Ollama
            </span>
            <Badge variant="primary" className="text-[10px] font-mono">₹0 / Free</Badge>
          </div>
          <p className="text-[11px] text-linear-text-muted leading-relaxed">
            Run open-weights models (qwen2.5-coder, llama3.2) locally on your hardware. Complete privacy.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("openai-compatible")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeMode === "openai-compatible"
              ? "bg-linear-surface-2 border-linear-accent ring-1 ring-linear-accent"
              : "bg-linear-surface-1 border-linear-border-1 hover:border-linear-border-2"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-linear-text-main flex items-center gap-1.5">
              <Key className="w-4 h-4 text-linear-accent" />
              2. Bring Your Key
            </span>
            <Badge variant="neutral" className="text-[10px] font-mono">Hosted API</Badge>
          </div>
          <p className="text-[11px] text-linear-text-muted leading-relaxed">
            Works on public Vercel deploy. Connect OpenAI, Groq, Together, OpenRouter, or DeepSeek.
          </p>
        </button>

        <button
          type="button"
          onClick={setOfflineMode}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeMode === "offline"
              ? "bg-linear-surface-2 border-linear-accent ring-1 ring-linear-accent"
              : "bg-linear-surface-1 border-linear-border-1 hover:border-linear-border-2"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-linear-text-main flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-linear-accent" />
              3. Offline Deterministic
            </span>
            <Badge variant="neutral" className="text-[10px] font-mono">No AI</Badge>
          </div>
          <p className="text-[11px] text-linear-text-muted leading-relaxed">
            Deterministic search & Mermaid architecture synthesis without any AI model requirements.
          </p>
        </button>
      </div>

      {/* Mode Details Section */}
      {activeMode === "openai-compatible" && (
        <Card className="p-6 space-y-6 bg-linear-surface-1 border-linear-border-1">
          <div>
            <h2 className="text-base font-semibold text-linear-text-main flex items-center gap-2">
              <Globe className="w-4 h-4 text-linear-accent" />
              OpenAI-Compatible Provider (Bring Your Own Key)
            </h2>
            <p className="text-xs text-linear-text-muted mt-1">
              Enables neural synthesis on the public Vercel deployment. Enter your credentials below.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-linear-text-secondary block mb-1.5">
                Endpoint Base URL
              </label>
              <Input
                value={byoBaseUrl}
                onChange={(e) => setByoBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-linear-text-subtle mt-1">
                Examples: <code>https://api.openai.com/v1</code>, <code>https://api.groq.com/openai/v1</code>, <code>https://openrouter.ai/api/v1</code>
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-linear-text-secondary block mb-1.5">
                API Key (Stored in sessionStorage ONLY)
              </label>
              <Input
                type="password"
                value={byoKey}
                onChange={(e) => setByoKey(e.target.value)}
                placeholder="sk-..."
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-linear-text-subtle mt-1">
                🔒 Security guarantee: Stored strictly in browser <code>sessionStorage</code>. Never persisted to databases, disk, or server logs.
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-linear-text-secondary block mb-1.5">
                Model Identifier
              </label>
              <Input
                value={byoModel}
                onChange={(e) => setByoModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-linear-text-subtle mt-1">
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
                  className="gap-1.5 text-linear-danger hover:bg-linear-danger/10"
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
                    ? "bg-linear-success/10 border-linear-success/30 text-linear-success"
                    : "bg-linear-danger/10 border-linear-danger/30 text-linear-danger"
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
        <Card className="p-6 space-y-6 bg-linear-surface-1 border-linear-border-1">
          <div>
            <h2 className="text-base font-semibold text-linear-text-main flex items-center gap-2">
              <Laptop className="w-4 h-4 text-linear-accent" />
              Local Ollama Daemon Configuration
            </h2>
            <p className="text-xs text-linear-text-muted mt-1">
              Connect to your local workstation daemon. 100% free with zero cloud fees.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-linear-text-secondary block mb-1.5">
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
              <label className="text-xs font-mono text-linear-text-secondary block mb-1.5">
                Model Name
              </label>
              <Input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="qwen2.5-coder:1.5b"
                className="font-mono text-xs"
              />
            </div>

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
                    ? "bg-linear-success/10 border-linear-success/30 text-linear-success"
                    : "bg-linear-surface-2 border-linear-border-2 text-linear-text-muted"
                }`}
              >
                {ollamaStatus.isAvailable ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-linear-success">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Connected to Ollama. Detected {ollamaStatus.models.length} local model(s).</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-linear-text-muted">
                    <div className="flex items-center gap-2 text-linear-warning font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Ollama not detected at {ollamaUrl}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      On the public Vercel deployment, local Ollama is only reachable if you run the app locally.
                      To run local inference on your computer, start Ollama:
                    </p>
                    <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5 font-mono text-xs">
                      <code>ollama run {ollamaModel}</code>
                      <button
                        type="button"
                        onClick={() => copyCommand(`ollama run ${ollamaModel}`)}
                        className="text-linear-text-subtle hover:text-white"
                      >
                        {copiedCmd ? <Check className="w-3.5 h-3.5 text-linear-success" /> : <Copy className="w-3.5 h-3.5" />}
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
