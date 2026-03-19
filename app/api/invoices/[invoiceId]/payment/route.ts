import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/utils";
import { getRelativePath } from "@/lib/upload";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const PAYMENT_ROLES = ["ADMIN", "CEO", "ACCOUNTANT"];

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  if (!PAYMENT_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { invoiceId } = await params;

  try {
    const existing = await prisma.vendorInvoice.findUnique({
      where: { id: invoiceId },
      include: { vendor: true },
    });
    if (!existing) return errorResponse("Invoice not found", 404);
    if (existing.paymentStatus === "PAID") {
      return errorResponse("Invoice is already fully paid", 422);
    }

    const formData = await request.formData();
    const paidAmountStr = formData.get("paidAmount") as string;
    const paidAtStr = formData.get("paidAt") as string;
    const proofFile = formData.get("paymentProof") as File | null;

    if (!paidAmountStr || !paidAtStr) {
      return errorResponse("paidAmount and paidAt are required");
    }

    const paidAmount = parseFloat(paidAmountStr);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      return errorResponse("Invalid paid amount");
    }

    let paymentProofPath: string | null = existing.paymentProofPath;

    if (proofFile) {
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(proofFile.type)) {
        return errorResponse("Only PDF, JPG, PNG files are allowed for payment proof");
      }
      if (proofFile.size > 10 * 1024 * 1024) {
        return errorResponse("Payment proof exceeds 10MB limit");
      }

      const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
      const vendorSlug = slugify(existing.vendor.name);
      const invoiceSlug = slugify(existing.invoiceNumber);
      const dir = path.resolve(UPLOAD_DIR, "vendors", vendorSlug, invoiceSlug);
      fs.mkdirSync(dir, { recursive: true });

      const ext = path.extname(proofFile.name);
      const filename = `payment_proof_${Date.now()}${ext}`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, Buffer.from(await proofFile.arrayBuffer()));
      paymentProofPath = getRelativePath(filePath);
    }

    // Determine new payment status
    const newPaidTotal = existing.paidAmount + paidAmount;
    const paymentStatus =
      newPaidTotal >= existing.totalAmount ? "PAID" : "PARTIAL";

    const invoice = await prisma.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidTotal,
        paidAt: new Date(paidAtStr),
        paymentStatus,
        paymentProofPath,
      },
    });

    return successResponse(invoice, `Payment recorded. Status: ${paymentStatus}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return errorResponse(message, 500);
  }
}
