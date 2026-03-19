import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils";

const EDIT_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      items: { orderBy: { createdAt: "asc" } },
      requests: {
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
          orderItem: true,
          invoices: { include: { vendor: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) return errorResponse("Order not found", 404);
  return successResponse(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!EDIT_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { orderId } = await params;

  try {
    const body = await request.json();

    // Block edits if any requests are APPROVED
    const approvedCount = await prisma.purchaseRequest.count({
      where: { orderId, status: "APPROVED" },
    });
    if (approvedCount > 0 && body.items) {
      return errorResponse(
        "Cannot edit order items when purchase requests are already approved",
        422
      );
    }

    const { orderNumber, orderDate, shippingDate, buyerId, notes, status, items } = body;

    // Check uniqueness if orderNumber is being changed
    if (orderNumber) {
      const existing = await prisma.order.findFirst({
        where: { orderNumber, NOT: { id: orderId } },
      });
      if (existing) return errorResponse("Order number already exists", 409);
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(orderNumber && { orderNumber }),
        ...(orderDate && { orderDate: new Date(orderDate) }),
        ...(shippingDate !== undefined && { shippingDate: shippingDate ? new Date(shippingDate) : null }),
        ...(buyerId && { buyerId }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item: { itemName: string; description?: string; qty: number; rate: number }) => ({
              itemName: item.itemName,
              description: item.description,
              qty: item.qty,
              rate: item.rate,
              amount: item.qty * item.rate,
            })),
          },
        }),
      },
      include: { items: true, buyer: true },
    });

    return successResponse(order, "Order updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update order", 500);
  }
}
