import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { rejectRequestSchema } from "@/lib/validations/request";

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
    const body = await request.json();
    const parsed = rejectRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const existing = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!existing) return errorResponse("Request not found", 404);
    if (existing.status !== "PENDING") {
      return errorResponse(`Cannot reject a request that is already ${existing.status}`, 422);
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectionNote: parsed.data.rejectionNote,
        approvedById: session.user.id!,
        approvedAt: new Date(),
      },
    });

    return successResponse(updated, "Request rejected");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to reject request", 500);
  }
}
