import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const baseStorageDir = path.join(process.cwd(), ".repopilot", "supabase", "storage", "workspaces");
  let fileCount = 0;
  let totalBytes = 0;

  try {
    if (fs.existsSync(baseStorageDir)) {
      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            fileCount++;
            totalBytes += fs.statSync(fullPath).size;
          }
        }
      };
      scanDir(baseStorageDir);
    }
  } catch {}

  return NextResponse.json({
    status: "online",
    engine: "RepoPilot Local Supabase Storage",
    version: "1.0.0",
    buckets: [
      {
        id: "workspaces",
        name: "workspaces",
        public: true,
        fileCount,
        totalBytes,
        fileSizeLimit: "50MB"
      }
    ],
    endpoints: {
      storage: "/api/supabase/storage/v1",
      objects: "/api/supabase/storage/v1/object/workspaces",
      status: "/api/supabase/status"
    },
    localStudioUrl: "/supabase"
  });
}
