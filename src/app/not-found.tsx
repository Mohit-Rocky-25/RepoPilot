"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Compass, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#010102] flex items-center justify-center p-6 text-[#F7F8F8] font-mono">
      <Card className="max-w-md w-full p-8 text-center space-y-6 bg-[#0F1011] border-[#23252A] shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mx-auto shadow-[0_0_24px_rgba(94,106,210,0.25)]">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#EF4444] font-semibold bg-[#EF4444]/10 border border-[#EF4444]/20 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>404 · Page Not Found</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F7F8F8]">
            Lost in Code Coordinates
          </h1>
          <p className="text-xs text-[#8A8F98] leading-relaxed">
            The requested route or resource does not exist in this RepoPilot instance. Navigate back to your previous location or return to Home.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
          >
            Go Back
          </Button>

          <Link href="/">
            <Button
              variant="primary"
              size="md"
              icon={<Home className="w-4 h-4" />}
            >
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
