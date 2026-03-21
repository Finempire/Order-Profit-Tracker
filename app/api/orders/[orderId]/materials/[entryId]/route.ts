import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

const ALLOWED_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orderId: string; entryId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!ALLOWED_ROLES.includes(session.user.role || "")) return forbiddenResponse();
  const { entryId } = await params;

  try {
    await prisma.materialCostEntry.delete({ where: { id: entryId } });
    return successResponse(null, "Material entry deleted");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to delete material entry", 500);
  }
}
