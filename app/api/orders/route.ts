import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { orderSchema } from "@/lib/validations/order";

const ALLOWED_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { buyer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.orderDate = {};
    if (dateFrom) (where.orderDate as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.orderDate as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        requests: {
          where: { status: "APPROVED" },
          include: { invoices: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = orders.map((order) => {
    const orderValue = order.items.reduce((s, i) => s + i.amount, 0);
    const estimatedCost = order.requests.reduce((s, r) => s + r.estimatedAmount, 0);
    const allInvoices = order.requests.flatMap((r) => r.invoices);
    const invoicedCost = allInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const costVariance = invoicedCost - estimatedCost;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      shippingDate: order.shippingDate,
      buyer: order.buyer,
      status: order.status,
      items: order.items.map((i) => ({ id: i.id, itemName: i.itemName })),
      orderValue,
      estimatedCost,
      invoicedCost,
      costVariance,
      createdAt: order.createdAt,
    };
  });

  return successResponse({ orders: data, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse({
      ...body,
      items: body.items?.map((item: Record<string, unknown>) => ({
        ...item,
        qty: Number(item.qty),
        rate: Number(item.rate),
      })),
    });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const { orderNumber, orderDate, shippingDate, buyerId, notes, items } = parsed.data;

    // Check uniqueness
    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (existing) return errorResponse("Order number already exists", 409);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        orderDate,
        shippingDate: shippingDate ?? null,
        buyerId,
        notes,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            description: item.description,
            qty: item.qty,
            rate: item.rate,
            amount: item.qty * item.rate,
          })),
        },
      },
      include: { items: true, buyer: true },
    });

    return successResponse(order, "Order created successfully", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create order", 500);
  }
}

