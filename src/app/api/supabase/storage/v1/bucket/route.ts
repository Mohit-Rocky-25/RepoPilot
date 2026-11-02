import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "workspaces",
      name: "workspaces",
      public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);
}

export async function POST() {
  return NextResponse.json({
    name: "workspaces",
    message: "Bucket workspaces is initialized and ready"
  });
}
