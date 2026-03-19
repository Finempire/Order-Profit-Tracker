import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return errorResponse("Both current and new password are required");
  }
  if (newPassword.length < 8) {
    return errorResponse("New password must be at least 8 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return errorResponse("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return errorResponse("Current password is incorrect", 401);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, mustChangePassword: false },
  });

  return successResponse({}, "Password changed successfully");
}
