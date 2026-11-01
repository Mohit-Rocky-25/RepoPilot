"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function GlobalErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error locally without exposing sensitive stack to public DOM
    console.error("Application error captured by boundary:", error.digest || "masked");
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-5 bg-theme-surface border border-theme-border shadow-card">
        <div className="w-12 h-12 rounded-xl bg-theme-danger/10 border border-theme-danger/30 flex items-center justify-center text-theme-danger mx-auto shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-theme-text font-mono">
            An Unexpected Error Occurred
          </h2>
          <p className="text-xs text-theme-text-muted leading-relaxed">
            The application encountered a problem. For security, internal system paths and runtime stack details are shielded.
          </p>
          {error.digest && (
            <div className="mt-2 text-[10px] font-mono text-theme-text-muted">
              Error Code: <code>{error.digest}</code>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reset()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
          <Link href="/">
            <Button
              variant="primary"
              size="sm"
              icon={<Home className="w-3.5 h-3.5" />}
            >
              Go to Homepage
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
