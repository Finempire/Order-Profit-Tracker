import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/server-utils";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return errorResponse("Current and new passwords are required");
    }
    if (newPassword.length < 6) {
      return errorResponse("New password must be at least 6 characters");
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return errorResponse("User not found");

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return errorResponse("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    return successResponse(null, "Password updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update password", 500);
  }
}
