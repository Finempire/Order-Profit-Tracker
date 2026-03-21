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
    const sheet = await ensureSheet(orderId);
    const entry = await prisma.overheadCostEntry.create({
      data: {
        sheetId:            sheet.id,
        name:               String(body.name || "").trim(),
        type:               body.type || "FIXED",
        totalAmount:        Number(body.totalAmount) || 0,
        apportionmentBasis: body.apportionmentBasis || "MANUAL",
        orderShare:         Number(body.orderShare)  || 0,
      },
    });
    return successResponse(entry, "Overhead entry added", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to add overhead entry", 500);
  }
}
