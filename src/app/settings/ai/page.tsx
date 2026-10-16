"use client";

import React, { useState, useEffect } from "react";
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
  Laptop
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function AISettingsPage() {
  const { aiConfig, setAiConfig } = useRepository();

  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl);
  const [modelName, setModelName] = useState(aiConfig.modelName);
  const [testing, setTesting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    isAvailable: boolean;
    models: string[];
    error?: string;
  } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setStatusResult(null);
    try {
      const res = await fetch(`/api/ai/status?baseUrl=${encodeURIComponent(baseUrl)}`);
      const data = await res.json();
      setStatusResult(data);

      setAiConfig((prev) => {
        const updated = {
          ...prev,
          baseUrl,
          modelName,
          isAvailable: data.isAvailable,
          lastPing: new Date().toISOString()
        };
        try {
          localStorage.setItem("REPOPILOT_AI_CONFIG", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (e: any) {
      setStatusResult({
        isAvailable: false,
        models: [],
        error: "Could not establish connection to local Ollama daemon."
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const saveSettings = () => {
    const updated = {
      ...aiConfig,
      baseUrl,
      modelName
    };
    setAiConfig(updated);
    try {
      localStorage.setItem("REPOPILOT_AI_CONFIG", JSON.stringify(updated));
    } catch (e) {}
    testConnection();
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title */}
      <div className="pb-3 border-b border-linear-border-1">
        <h1 className="text-lg font-semibold text-linear-text-main font-mono flex items-center gap-2">
          <Activity className="w-5 h-5 text-linear-accent" />
          <span>Local AI (Ollama) Diagnostics & Configuration</span>
        </h1>
        <p className="text-xs text-linear-text-muted mt-0.5">
          Configure zero-cost, private, local open-weights inference without hosted cloud API fees.
        </p>
      </div>

      {/* Connection Status Card */}
      <Card className="p-5 space-y-4 bg-linear-surface-1 border-linear-border-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            {statusResult?.isAvailable ? (
              <div className="w-9 h-9 rounded-full bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-linear-success" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-rose-950/40 border border-rose-800/60 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-linear-danger" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-linear-text-main font-mono">
                  {statusResult?.isAvailable ? "Ollama Connected & Operational" : "Ollama Daemon Offline / Unreachable"}
                </h2>
                <Badge variant={statusResult?.isAvailable ? "success" : "neutral"} size="sm">
                  {statusResult?.isAvailable ? "ONLINE" : "OFFLINE"}
                </Badge>
              </div>
              <p className="text-xs text-linear-text-muted mt-0.5 font-mono">
                Active Endpoint: <code className="text-linear-accent-hover bg-linear-surface-2 px-1.5 py-0.5 rounded border border-linear-border-1">{baseUrl}</code>
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={testConnection}
            isLoading={testing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Test Connection
          </Button>
        </div>

        {statusResult && !statusResult.isAvailable && (
          <div className="p-3.5 rounded-lg bg-linear-surface-2 border border-linear-border-1 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-linear-text-main font-semibold">
              <AlertCircle className="w-4 h-4 text-linear-warning" />
              <span>Offline Diagnostic & Graceful Fallback Active</span>
            </div>
            <p className="text-linear-text-muted leading-relaxed">
              No local Ollama server answered on <code className="text-linear-text-main font-semibold">{baseUrl}</code>.
              RepoPilot will automatically operate in <strong>100% offline deterministic mode</strong> — code search, AST symbol indexing, and architecture mapping remain fully functional.
            </p>
          </div>
        )}

        {statusResult?.models && statusResult.models.length > 0 && (
          <div className="pt-2 border-t border-linear-border-1 space-y-1.5">
            <span className="text-[11px] font-mono text-linear-text-subtle uppercase font-semibold">
              Installed Models on Local Machine ({statusResult.models.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {statusResult.models.map((m) => (
                <button
                  key={m}
                  onClick={() => setModelName(m)}
                  className={`px-2.5 py-1 rounded font-mono text-xs border transition-colors ${
                    modelName === m
                      ? "bg-linear-accent text-white border-linear-accent font-medium shadow-xs"
                      : "bg-linear-surface-2 text-linear-text-muted hover:text-linear-text-main hover:bg-linear-surface-3 border-linear-border-1"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Settings Form */}
      <Card className="p-5 space-y-4 bg-linear-surface-1 border-linear-border-1">
        <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
          Endpoint & Model Configuration
        </h2>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-linear-text-secondary mb-1.5 font-medium">
              Ollama Base URL
            </label>
            <Input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <label className="block text-linear-text-secondary mb-1.5 font-medium">
              Target Model Identifier
            </label>
            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="qwen2.5-coder:1.5b"
            />
            <span className="text-[11px] text-linear-text-subtle block mt-1">
              Recommended lightweight coding models: <code>qwen2.5-coder:1.5b</code>, <code>llama3.2:3b</code>, <code>deepseek-coder:1.3b</code>
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={saveSettings}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Setup Instructions */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-linear-surface-1 border-linear-border-1">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-linear-accent" />
          <h2 className="text-sm font-semibold text-linear-text-main uppercase">
            Windows / macOS / Linux Local Setup Guide
          </h2>
        </div>

        <ol className="list-decimal list-inside space-y-2.5 text-linear-text-muted leading-relaxed pl-1">
          <li>
            Download and install Ollama from{" "}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
              className="text-linear-accent hover:text-linear-accent-hover underline inline-flex items-center gap-0.5"
            >
              <span>https://ollama.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            Open PowerShell (or Terminal) and pull a lightweight open-weights coding model:
            <div className="mt-1.5 flex items-center justify-between p-2.5 bg-linear-surface-2 border border-linear-border-1 rounded-lg text-linear-text-main">
              <code>ollama run qwen2.5-coder:1.5b</code>
              <Button
                variant="ghost"
                size="sm"
                icon={copiedCmd ? <Check className="w-3.5 h-3.5 text-linear-success" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => copyCommand("ollama run qwen2.5-coder:1.5b")}
              >
                {copiedCmd ? "Copied" : "Copy"}
              </Button>
            </div>
          </li>
          <li>
            Once running, click <strong>"Test Connection"</strong> above. RepoPilot will immediately recognize your local model!
          </li>
        </ol>
      </Card>
    </div>
  );
}
