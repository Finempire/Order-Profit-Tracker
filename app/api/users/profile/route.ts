import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/server-utils";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) return errorResponse("Name and email are required");

    const existing = await prisma.user.findFirst({
      where: { email, id: { not: session.user.id } },
    });
    if (existing) return errorResponse("Email already in use");

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
      select: { id: true, name: true, email: true, role: true },
    });

    return successResponse(user, "Profile updated");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to update profile", 500);
  }
}
