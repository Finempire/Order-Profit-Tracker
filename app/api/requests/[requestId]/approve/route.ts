import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

const APPROVE_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!APPROVE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { requestId } = await params;

  try {
    const existing = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!existing) return errorResponse("Request not found", 404);
    if (existing.status !== "PENDING") {
      return errorResponse(`Cannot approve a request that is already ${existing.status}`, 422);
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id!,
        approvedAt: new Date(),
        rejectionNote: null,
      },
      include: {
        order: { select: { orderNumber: true } },
        requestedBy: { select: { name: true } },
      },
    });

    return successResponse(updated, "Request approved");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to approve request", 500);
  }
}
