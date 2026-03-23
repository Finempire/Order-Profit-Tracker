import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/server-utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { requestId } = await params;

  try {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: {
        order: { select: { id: true, orderNumber: true, status: true, buyer: { select: { name: true } } } },
        orderItem: { select: { id: true, itemName: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        items: { orderBy: { createdAt: "asc" } },
        invoices: { include: { vendor: { select: { id: true, name: true } } } },
      },
    });

    if (!request) return errorResponse("Request not found", 404);

    // PRODUCTION can only see their own requests
    if (session.user.role === "PRODUCTION" && request.requestedById !== session.user.id) {
      return errorResponse("Not found", 404);
    }

    return successResponse(request);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to fetch request", 500);
  }
}
