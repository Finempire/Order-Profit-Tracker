import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateRequestNumber, successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { requestSchema } from "@/lib/validations/request";

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
    const parsed = requestSchema.safeParse({
      ...body,
      qty: Number(body.qty),
      rate: Number(body.rate),
    });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
    if (!order) return errorResponse("Order not found", 404);
    if (order.status !== "ACTIVE") return errorResponse("Cannot raise request on non-active order", 422);

    const requestNumber = await generateRequestNumber();
    const estimatedAmount = parsed.data.qty * parsed.data.rate;

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        orderId: parsed.data.orderId,
        orderItemId: parsed.data.orderItemId || null,
        requestType: parsed.data.requestType,
        description: parsed.data.description,
        qty: parsed.data.qty,
        rate: parsed.data.rate,
        estimatedAmount,
        requestedById: session.user.id!,
        status: "PENDING",
      },
      include: {
        order: { select: { orderNumber: true } },
        requestedBy: { select: { name: true } },
      },
    });

    return successResponse(purchaseRequest, `Request ${requestNumber} raised successfully`, 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create request", 500);
  }
}

