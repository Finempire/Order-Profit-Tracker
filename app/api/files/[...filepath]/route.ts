import { auth } from "@/lib/auth";
import { unauthorizedResponse, errorResponse } from "@/lib/utils";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { filepath } = await params;
  const relativePath = filepath.join("/");

  const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  const requestedPath = path.resolve(UPLOAD_DIR, relativePath);

  // Path traversal prevention
  if (!requestedPath.startsWith(UPLOAD_DIR)) {
    return errorResponse("Forbidden: path traversal detected", 403);
  }

  if (!fs.existsSync(requestedPath)) {
    return errorResponse("File not found", 404);
  }

  const ext = path.extname(requestedPath).toLowerCase();
  const contentType = MIME_MAP[ext];
  if (!contentType) {
    return errorResponse("Unsupported file type", 415);
  }

  const fileBuffer = fs.readFileSync(requestedPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "private, no-cache",
      "Content-Disposition": `inline; filename="${path.basename(requestedPath)}"`,
    },
  });
}
