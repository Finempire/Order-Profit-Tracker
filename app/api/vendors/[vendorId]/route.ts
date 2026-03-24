import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { vendorSchema } from "@/lib/validations/vendor";

const MANAGE_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];
const DELETE_ROLES = ["ADMIN"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      invoices: {
        include: { request: { include: { order: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!vendor) return errorResponse("Vendor not found", 404);
  return successResponse(vendor);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!MANAGE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { vendorId } = await params;
  try {
    const body = await request.json();
    const parsed = vendorSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const vendor = await prisma.vendor.update({ where: { id: vendorId }, data: parsed.data });
    return successResponse(vendor, "Vendor updated");
  } catch {
    return errorResponse("Failed to update vendor", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!DELETE_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { vendorId } = await params;
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return errorResponse("Vendor not found", 404);
    await prisma.vendor.delete({ where: { id: vendorId } });
    return successResponse(null, "Vendor deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to delete vendor. It may have associated invoices.", 500);
  }
}
