"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";
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
      <Card className="max-w-md w-full p-8 text-center space-y-5 bg-[#0F1011] border border-[#23252A] shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-center text-[#EF4444] mx-auto shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-[#F7F8F8] font-mono">
            An Unexpected Error Occurred
          </h2>
          <p className="text-xs text-[#8A8F98] leading-relaxed">
            The application encountered a problem. For security, internal system paths and runtime stack details are shielded.
          </p>
          {error.digest && (
            <div className="mt-2 text-[10px] font-mono text-[#62666D]">
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
