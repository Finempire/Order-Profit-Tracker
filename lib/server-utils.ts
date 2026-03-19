import { prisma } from "./db";

// ─── Auto-generated number helpers ────────────────────────────────────────────

export async function generateRequestNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `REQ-${year}${month}${day}`;

  const lastRequest = await prisma.purchaseRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" },
  });

  let seq = 1;
  if (lastRequest) {
    const lastSeq = parseInt(lastRequest.requestNumber.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

// ─── API response helpers ─────────────────────────────────────────────────────

export function successResponse(data: unknown, message = "OK", status = 200) {
  return Response.json({ success: true, data, message, error: null }, { status });
}

export function errorResponse(error: string, status = 400) {
  return Response.json({ success: false, data: null, message: error, error }, { status });
}

export function unauthorizedResponse() {
  return Response.json(
    { success: false, data: null, message: "Unauthorized", error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbiddenResponse() {
  return Response.json(
    { success: false, data: null, message: "Forbidden", error: "Forbidden" },
    { status: 403 }
  );
}
