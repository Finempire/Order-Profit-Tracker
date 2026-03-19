import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { buyerSchema } from "@/lib/validations/buyer";

const MANAGE_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const minimal = searchParams.get("minimal") === "true";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

  if (minimal) {
    const buyers = await prisma.buyer.findMany({
      select: { id: true, name: true, email: true, phone: true, address: true, shippingAddress: true, gstin: true },
      orderBy: { name: "asc" },
    });
    return successResponse(buyers);
  }

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, buyers] = await Promise.all([
    prisma.buyer.count({ where }),
    prisma.buyer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return successResponse({ buyers, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!MANAGE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  try {
    const body = await request.json();
    const parsed = buyerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const buyer = await prisma.buyer.create({ data: parsed.data });
    return successResponse(buyer, "Buyer created", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create buyer", 500);
  }
}

