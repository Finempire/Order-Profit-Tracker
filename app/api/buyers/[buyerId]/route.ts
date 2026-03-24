import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { buyerSchema } from "@/lib/validations/buyer";

const MANAGE_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];
const DELETE_ROLES = ["ADMIN"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  const { buyerId } = await params;

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!buyer) return errorResponse("Buyer not found", 404);
  return successResponse(buyer);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!MANAGE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { buyerId } = await params;
  try {
    const body = await request.json();
    const parsed = buyerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const buyer = await prisma.buyer.update({ where: { id: buyerId }, data: parsed.data });
    return successResponse(buyer, "Buyer updated");
  } catch {
    return errorResponse("Failed to update buyer", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!DELETE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { buyerId } = await params;
  try {
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) return errorResponse("Buyer not found", 404);
    await prisma.buyer.delete({ where: { id: buyerId } });
    return successResponse(null, "Buyer deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to delete buyer. It may have associated orders.", 500);
  }
}
