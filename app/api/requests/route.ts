import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateRequestNumber, successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { poRequestSchema } from "@/lib/validations/request";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const requestType = searchParams.get("requestType") || "";
  const orderId = searchParams.get("orderId") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

  const where: Record<string, unknown> = {};

  // PRODUCTION sees only their own requests
  if (session.user.role === "PRODUCTION") {
    where.requestedById = session.user.id;
  }

  if (status) where.status = status;
  if (requestType) where.requestType = requestType;
  if (orderId) where.orderId = orderId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [total, requests] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
        orderItem: { select: { id: true, itemName: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        invoices: { include: { vendor: { select: { id: true, name: true } } } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return successResponse({ requests, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const ALLOWED = ["ADMIN", "PRODUCTION"];
  if (!ALLOWED.includes(session.user.role || "")) return forbiddenResponse();

  try {
    const body = await request.json();

    const parsed = poRequestSchema.safeParse({
      ...body,
      items: (body.items || []).map((item: Record<string, unknown>) => ({
        ...item,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
    });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
    if (!order) return errorResponse("Order not found", 404);
    if (order.status !== "ACTIVE") return errorResponse("Cannot raise request on non-active order", 422);

    const requestNumber = await generateRequestNumber();

    // Calculate totals from items
    const items = parsed.data.items.map((item) => ({
      ...item,
      amount: item.qty * item.rate,
    }));
    const estimatedAmount = items.reduce((sum, i) => sum + i.amount, 0);

    // Use first item for legacy fields (backward compat)
    const firstItem = items[0];

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        orderId: parsed.data.orderId,
        orderItemId: parsed.data.orderItemId || null,
        requestType: parsed.data.requestType,
        description: firstItem.description,
        qty: firstItem.qty,
        rate: firstItem.rate,
        estimatedAmount,
        notes: parsed.data.notes || null,
        attachmentUrl: parsed.data.attachmentUrl || null,
        requestedById: session.user.id!,
        status: "PENDING",
        items: {
          create: items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unit: item.unit || "pcs",
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: {
        order: { select: { orderNumber: true } },
        requestedBy: { select: { name: true } },
        items: true,
      },
    });

    return successResponse(purchaseRequest, `PO ${requestNumber} raised successfully`, 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create purchase order", 500);
  }
}
