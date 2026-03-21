import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

const ALLOWED_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

async function getSheet(orderId: string) {
  return prisma.jobCostSheet.upsert({
    where: { orderId },
    create: { orderId },
    update: {},
    include: {
      materials: { orderBy: { createdAt: "asc" } },
      labour:    { orderBy: { createdAt: "asc" } },
      overheads: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();
  const { orderId } = await params;
  const sheet = await getSheet(orderId);
  return successResponse(sheet);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();
  const { orderId } = await params;

  try {
    const body = await req.json();
    const sheet = await prisma.jobCostSheet.upsert({
      where: { orderId },
      create: {
        orderId,
        unitsProduced:   Number(body.unitsProduced)   || 0,
        standardCost:    Number(body.standardCost)    || 0,
        budgetedRevenue: Number(body.budgetedRevenue) || 0,
        targetPrice:     body.targetPrice   != null ? Number(body.targetPrice)   : null,
        desiredProfit:   body.desiredProfit != null ? Number(body.desiredProfit) : null,
      },
      update: {
        ...(body.unitsProduced   != null && { unitsProduced:   Number(body.unitsProduced) }),
        ...(body.standardCost    != null && { standardCost:    Number(body.standardCost) }),
        ...(body.budgetedRevenue != null && { budgetedRevenue: Number(body.budgetedRevenue) }),
        targetPrice:   body.targetPrice   != null ? Number(body.targetPrice)   : null,
        desiredProfit: body.desiredProfit != null ? Number(body.desiredProfit) : null,
      },
      include: {
        materials: { orderBy: { createdAt: "asc" } },
        labour:    { orderBy: { createdAt: "asc" } },
        overheads: { orderBy: { createdAt: "asc" } },
      },
    });
    return successResponse(sheet, "Job cost sheet updated");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update job cost sheet", 500);
  }
}
