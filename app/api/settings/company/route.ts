import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";
import { z } from "zod";

const companySchema = z.object({
  companyName: z.string().max(200).optional().default(""),
  gstin:       z.string().max(20).optional().default(""),
  address:     z.string().max(500).optional().default(""),
  phone:       z.string().max(30).optional().default(""),
  email:       z.string().max(200).optional().default(""),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    const setting = await prisma.companySetting.findUnique({ where: { id: "singleton" } });
    return successResponse(setting ?? { id: "singleton", companyName: "", gstin: "", address: "", phone: "", email: "" });
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to fetch company settings", 500);
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (session.user.role !== "ADMIN") return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const setting = await prisma.companySetting.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", ...parsed.data },
      update: parsed.data,
    });
    return successResponse(setting, "Company info saved successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to save company settings", 500);
  }
}
