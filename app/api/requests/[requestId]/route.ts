import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { z } from "zod";

const DELETE_ROLES = ["ADMIN"];
const EDIT_ROLES   = ["ADMIN", "PRODUCTION"];

const editPoSchema = z.object({
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    qty:  z.number().positive(),
    unit: z.string().default("pcs"),
    rate: z.number().min(0),
  })).min(1).optional(),
});

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!EDIT_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { requestId } = await params;
  try {
    const existing = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!existing) return errorResponse("Request not found", 404);
    if (existing.status !== "PENDING") return errorResponse("Only PENDING purchase orders can be edited", 422);

    // PRODUCTION can only edit their own
    if (session.user.role === "PRODUCTION" && existing.requestedById !== session.user.id) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const parsed = editPoSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const { notes, items } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;

    if (items && items.length > 0) {
      const itemsWithAmount = items.map((i) => ({ ...i, amount: i.qty * i.rate }));
      const estimatedAmount = itemsWithAmount.reduce((s, i) => s + i.amount, 0);
      updateData.estimatedAmount = estimatedAmount;
      updateData.description = itemsWithAmount[0].description;
      updateData.qty  = itemsWithAmount[0].qty;
      updateData.rate = itemsWithAmount[0].rate;

      // Replace all line items
      await prisma.purchaseRequestItem.deleteMany({ where: { requestId } });
      await prisma.purchaseRequestItem.createMany({
        data: itemsWithAmount.map((i) => ({ requestId, ...i })),
      });
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        order: { select: { orderNumber: true } },
        items: true,
      },
    });

    return successResponse(updated, "Purchase order updated");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update request", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!DELETE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { requestId } = await params;
  try {
    const req = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!req) return errorResponse("Request not found", 404);
    await prisma.purchaseRequest.delete({ where: { id: requestId } });
    return successResponse(null, "Purchase request deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to delete request", 500);
  }
}
