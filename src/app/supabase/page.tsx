"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Cloud,
  HardDrive,
  FolderArchive,
  RefreshCw,
  ExternalLink,
  Check,
  Copy,
  Download,
  FileCode,
  FileText,
  Server,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  LOCAL_SUPABASE_DEFAULT_URL,
  LOCAL_SUPABASE_ANON_KEY,
  SUPABASE_BUCKET_WORKSPACES,
  getSupabaseUrl,
  isLocalSupabase
} from "@/lib/supabase";

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  size: number;
}

export default function SupabaseStoragePage() {
  const { snapshots, syncNow, isSyncing, user } = useWorkspace();
  const [status, setStatus] = useState<any>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchStatusAndFiles = async () => {
    setLoading(true);
    try {
      const [statusRes, filesRes] = await Promise.all([
        fetch("/api/supabase/status"),
        fetch(`/api/supabase/storage/v1/object/list/${SUPABASE_BUCKET_WORKSPACES}`)
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (filesRes.ok) {
        const fileList = await filesRes.json();
        setFiles(Array.isArray(fileList) ? fileList : []);
      }
    } catch (e) {
      console.warn("Could not load local Supabase status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndFiles();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestUpload = async () => {
    if (snapshots.length === 0) {
      alert("No snapshots found to upload! Please save a snapshot first in /explore or /history.");
      return;
    }
    const snap = snapshots[0];
    const userId = user?.id || "local_dev";
    const endpoint = `/api/supabase/storage/v1/object/${SUPABASE_BUCKET_WORKSPACES}/${userId}/${snap.id}.json`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snap)
      });
      if (res.ok) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2500);
        await fetchStatusAndFiles();
      }
    } catch (e) {
      console.error("Test upload failed:", e);
    }
  };

  const currentUrl = typeof window !== "undefined" ? `${window.location.origin}/api/supabase` : LOCAL_SUPABASE_DEFAULT_URL;
  const storageEndpoint = `${currentUrl}/storage/v1`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-theme-green-surface border border-theme-green/30 flex items-center justify-center text-theme-green shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-text">
              Local Supabase Storage
            </h1>
            <Badge variant="success" size="sm">
              Online
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-theme-text-muted">
            Embedded zero-cost Supabase Storage engine for persisting repository workspaces &amp; audits.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            onClick={fetchStatusAndFiles}
          >
            Refresh
          </Button>
          <Link href="/history">
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Saved Workspaces
            </Button>
          </Link>
        </div>
      </div>

      {/* Connection Coordinates Card */}
      <Card className="p-4 sm:p-5 bg-theme-surface border-theme-border rounded-xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-theme-blue" />
            <h2 className="text-sm font-semibold text-theme-text">Localhost Connection Coordinates</h2>
          </div>
          <span className="text-[11px] text-theme-green-text flex items-center gap-1 font-medium">
            <Zap className="w-3 h-3 text-theme-green" />
            <span>Ready for @supabase/supabase-js</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center justify-between text-theme-text-muted text-[11px]">
              <span>SUPABASE_URL</span>
              <button
                type="button"
                onClick={() => handleCopy(currentUrl, "url")}
                className="hover:text-theme-blue flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "url" ? <Check className="w-3 h-3 text-theme-green" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "url" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="font-semibold text-theme-text truncate select-all">{currentUrl}</div>
          </div>

          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center justify-between text-theme-text-muted text-[11px]">
              <span>STORAGE_ENDPOINT</span>
              <button
                type="button"
                onClick={() => handleCopy(storageEndpoint, "endpoint")}
                className="hover:text-theme-blue flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "endpoint" ? <Check className="w-3 h-3 text-theme-green" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "endpoint" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="font-semibold text-theme-text truncate select-all">{storageEndpoint}</div>
          </div>

          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1 md:col-span-2">
            <div className="flex items-center justify-between text-theme-text-muted text-[11px]">
              <span>ANON_KEY (Local Offline Key)</span>
              <button
                type="button"
                onClick={() => handleCopy(LOCAL_SUPABASE_ANON_KEY, "key")}
                className="hover:text-theme-blue flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === "key" ? <Check className="w-3 h-3 text-theme-green" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "key" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="font-semibold text-theme-text truncate select-all text-[11px]">
              {LOCAL_SUPABASE_ANON_KEY}
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Bucket Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-green shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-theme-text">workspaces</div>
            <div className="text-[11px] text-theme-text-muted">Active Bucket</div>
          </div>
        </Card>

        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue shrink-0">
            <FolderArchive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-theme-text">{files.length}</div>
            <div className="text-[11px] text-theme-text-muted">Stored Snapshots</div>
          </div>
        </Card>

        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-warning-text shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-theme-text">
              {status?.buckets?.[0]?.totalBytes ? `${(status.buckets[0].totalBytes / 1024).toFixed(1)} KB` : "0 KB"}
            </div>
            <div className="text-[11px] text-theme-text-muted">Storage Consumed</div>
          </div>
        </Card>
      </div>

      {/* Bucket Objects Explorer */}
      <Card className="p-4 sm:p-5 bg-theme-surface border-theme-border rounded-xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border">
          <div>
            <h2 className="text-sm font-semibold text-theme-text">
              Bucket Objects: <code className="text-theme-blue">/workspaces</code>
            </h2>
            <p className="text-[11px] text-theme-text-muted">
              Live JSON snapshots persisted into the Supabase storage bucket.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestUpload}
              title="Upload current workspace snapshot to test storage"
            >
              {uploadSuccess ? "✓ Uploaded!" : "Upload Test Snapshot"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSyncing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
              onClick={() => syncNow()}
            >
              Sync Workspaces
            </Button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-theme-text-muted text-xs">
            <div className="w-10 h-10 rounded-full bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-text-muted mx-auto">
              <Database className="w-5 h-5" />
            </div>
            <div>No snapshots in Supabase Storage bucket yet.</div>
            <p className="text-[11px] text-theme-text-subtle">
              Click &quot;Upload Test Snapshot&quot; above or save an investigation in Code Explorer to populate this bucket.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-theme-border overflow-x-auto">
            {files.map((file) => (
              <div
                key={file.name}
                className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-theme-surface-alt px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode className="w-4 h-4 text-theme-blue shrink-0" />
                  <span className="font-semibold text-theme-text truncate">{file.name}</span>
                  <span className="text-[11px] text-theme-text-muted shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-theme-text-subtle hidden sm:inline">
                    {new Date(file.updated_at).toLocaleTimeString()}
                  </span>
                  <a
                    href={`/api/supabase/storage/v1/object/public/${SUPABASE_BUCKET_WORKSPACES}/${file.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-theme-border hover:bg-theme-surface text-theme-blue flex items-center gap-1 text-[11px] transition-colors"
                    title="Open JSON raw object"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View JSON</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
