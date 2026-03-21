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
    const qty      = Number(body.qty)      || 0;
    const unitCost = Number(body.unitCost) || 0;

    const sheet = await ensureSheet(orderId);
    const entry = await prisma.materialCostEntry.create({
      data: {
        sheetId:         sheet.id,
        materialName:    String(body.materialName || "").trim(),
        qty,
        unitCost,
        valuationMethod: body.valuationMethod || "FIFO",
        totalCost:       qty * unitCost,
      },
    });
    return successResponse(entry, "Material entry added", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to add material entry", 500);
  }
}
