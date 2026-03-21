import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

const ALLOWED_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

async function ensureSheet(orderId: string) {
  return prisma.jobCostSheet.upsert({
    where: { orderId },
    create: { orderId },
    update: {},
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();
  const { orderId } = await params;

  try {
    const body = await req.json();
    const method = body.method || "TIME_RATE";

    let totalCost = 0;
    if (method === "TIME_RATE") {
      totalCost = (Number(body.hours) || 0) * (Number(body.ratePerHour) || 0);
    } else {
      totalCost = (Number(body.units) || 0) * (Number(body.ratePerUnit) || 0);
    }

    const sheet = await ensureSheet(orderId);
    const entry = await prisma.labourCostEntry.create({
      data: {
        sheetId:     sheet.id,
        workerName:  String(body.workerName || "").trim(),
        method,
        hours:       method === "TIME_RATE" ? Number(body.hours) || null : null,
        ratePerHour: method === "TIME_RATE" ? Number(body.ratePerHour) || null : null,
        units:       method === "PIECE_RATE" ? Number(body.units) || null : null,
        ratePerUnit: method === "PIECE_RATE" ? Number(body.ratePerUnit) || null : null,
        totalCost,
      },
    });
    return successResponse(entry, "Labour entry added", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to add labour entry", 500);
  }
}
