import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function getLocalStorageDir(bucket: string): string {
  // Safe bucket path
  const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(process.cwd(), ".repopilot", "supabase", "storage", safeBucket || "workspaces");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function resolveObjectFilePath(bucket: string, objectPathParts: string[]): string {
  const baseDir = getLocalStorageDir(bucket);
  // Sanitize path segments to prevent traversal
  const safeParts = objectPathParts.map((p) => p.replace(/[^a-zA-Z0-9_.-]/g, "_"));
  return path.join(baseDir, ...safeParts);
}

/**
 * GET - Serve object or list objects
 * Matches:
 * /api/supabase/storage/v1/object/public/:bucket/:filePath*
 * /api/supabase/storage/v1/object/authenticated/:bucket/:filePath*
 * /api/supabase/storage/v1/object/list/:bucket
 * /api/supabase/storage/v1/object/:bucket/:filePath*
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const parts = params.path || [];
  if (parts.length === 0) {
    return NextResponse.json({ error: "Missing storage object path" }, { status: 400 });
  }

  // Handle listing: object/list/:bucket
  if (parts[0] === "list" && parts.length >= 2) {
    return handleListObjects(parts[1], req);
  }

  // Handle public/authenticated downloads
  let bucket = parts[0];
  let objectParts = parts.slice(1);

  if (bucket === "public" || bucket === "authenticated") {
    bucket = parts[1];
    objectParts = parts.slice(2);
  }

  if (objectParts.length === 0) {
    return handleListObjects(bucket, req);
  }

  const filePath = resolveObjectFilePath(bucket, objectParts);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return NextResponse.json({ error: "Object not found in Supabase Storage" }, { status: 404 });
  }

  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = filePath.endsWith(".json")
      ? "application/json"
      : filePath.endsWith(".md")
      ? "text/markdown"
      : "application/octet-stream";

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST - Upload object or list objects
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const parts = params.path || [];
  if (parts.length === 0) {
    return NextResponse.json({ error: "Missing storage path" }, { status: 400 });
  }

  // Handle list via POST: object/list/:bucket
  if (parts[0] === "list" && parts.length >= 2) {
    return handleListObjects(parts[1], req);
  }

  const bucket = parts[0];
  const objectParts = parts.slice(1);

  if (objectParts.length === 0) {
    return NextResponse.json({ error: "Missing file name" }, { status: 400 });
  }

  const targetPath = resolveObjectFilePath(bucket, objectParts);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await req.json();
      fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), "utf8");
    } else {
      const buffer = Buffer.from(await req.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
    }

    const stat = fs.statSync(targetPath);
    const key = `${bucket}/${objectParts.join("/")}`;

    return NextResponse.json({
      Key: key,
      Id: objectParts[objectParts.length - 1],
      message: "Uploaded to Local Supabase Storage successfully",
      size: stat.size,
      updatedAt: stat.mtime.toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload object" }, { status: 500 });
  }
}

/**
 * DELETE - Remove object from storage
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const parts = params.path || [];
  if (parts.length < 2) {
    return NextResponse.json({ error: "Missing object path" }, { status: 400 });
  }

  const bucket = parts[0];
  const objectParts = parts.slice(1);
  const filePath = resolveObjectFilePath(bucket, objectParts);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return NextResponse.json({ message: "Object deleted successfully" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Object already deleted or not found" });
}

function handleListObjects(bucket: string, req: NextRequest): NextResponse {
  const dir = getLocalStorageDir(bucket);
  const prefix = req.nextUrl.searchParams.get("prefix") || "";

  const results: Array<{
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    size: number;
    metadata: { mimetype: string; size: number };
  }> = [];

  const scan = (currentDir: string, relativePath: string) => {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        scan(full, rel);
      } else if (entry.isFile()) {
        if (!prefix || rel.startsWith(prefix)) {
          const stat = fs.statSync(full);
          results.push({
            name: rel,
            id: entry.name,
            updated_at: stat.mtime.toISOString(),
            created_at: stat.birthtime.toISOString(),
            size: stat.size,
            metadata: {
              mimetype: rel.endsWith(".json") ? "application/json" : "text/plain",
              size: stat.size
            }
          });
        }
      }
    }
  };

  scan(dir, "");

  return NextResponse.json(results);
}
