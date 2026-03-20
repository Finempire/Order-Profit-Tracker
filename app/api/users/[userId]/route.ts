import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (session.user.role !== "ADMIN") return forbiddenResponse();

  const { userId } = await params;

  try {
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      if (password.length < 6) return errorResponse("Password must be at least 6 characters");
      updateData.password = await bcrypt.hash(password, 12);
      updateData.mustChangePassword = true;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return successResponse(user, "User updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update user", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (session.user.role !== "ADMIN") return forbiddenResponse();

  const { userId } = await params;

  if (session.user.id === userId) return errorResponse("Cannot deactivate your own account");

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
    return successResponse(user, "User deactivated");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to deactivate user", 500);
  }
}
