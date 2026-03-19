import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { vendorSchema } from "@/lib/validations/vendor";

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
    const vendors = await prisma.vendor.findMany({
      select: { id: true, name: true, email: true, phone: true, address: true, gstin: true },
      orderBy: { name: "asc" },
    });
    return successResponse(vendors);
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

  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      include: { _count: { select: { invoices: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return successResponse({ vendors, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!MANAGE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  try {
    const body = await request.json();
    const parsed = vendorSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const vendor = await prisma.vendor.create({ data: parsed.data });
    return successResponse(vendor, "Vendor created", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create vendor", 500);
  }
}

