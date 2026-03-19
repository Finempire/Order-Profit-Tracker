import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrderCostSummary } from "@/lib/cost-calculator";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

const ALLOWED_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return errorResponse("Order not found", 404);

  const summary = await getOrderCostSummary(orderId);
  return successResponse(summary);
}
