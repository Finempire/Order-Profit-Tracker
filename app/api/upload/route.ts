import { auth } from "@/lib/auth";
import { unauthorizedResponse, errorResponse } from "@/lib/server-utils";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return errorResponse("No file provided", 400);

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return errorResponse("File too large (max 10MB)", 413);

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const allowed = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"];
    if (!allowed.includes(ext)) return errorResponse("File type not allowed", 415);

    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, filename), Buffer.from(bytes));

    return Response.json({ success: true, data: { url: `/uploads/${filename}`, name: file.name } });
  } catch (err) {
    console.error(err);
    return errorResponse("Upload failed", 500);
  }
}
