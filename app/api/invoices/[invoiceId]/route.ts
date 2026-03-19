import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/server-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();
  const { invoiceId } = await params;

  const invoice = await prisma.vendorInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      vendor: true,
      request: {
        include: {
          order: { include: { buyer: true } },
          orderItem: true,
          requestedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!invoice) return errorResponse("Invoice not found", 404);
  return successResponse(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const EDIT_ROLES = ["ADMIN", "ACCOUNTANT"];
  if (!EDIT_ROLES.includes(session.user.role || "")) return forbiddenResponse();

  const { invoiceId } = await params;
  try {
    const existing = await prisma.vendorInvoice.findUnique({ where: { id: invoiceId } });
    if (!existing) return errorResponse("Invoice not found", 404);
    if (existing.paymentStatus === "PAID") {
      return errorResponse("Cannot edit a fully paid invoice", 422);
    }

    const body = await request.json();
    const { description, invoiceType, qty, rate, amount, gstAmount, totalAmount } = body;

    const invoice = await prisma.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        ...(description !== undefined && { description }),
        ...(invoiceType && { invoiceType }),
        ...(qty !== undefined && { qty: parseFloat(qty) }),
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(gstAmount !== undefined && { gstAmount: parseFloat(gstAmount) }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
      },
    });

    return successResponse(invoice, "Invoice updated");
  } catch {
    return errorResponse("Failed to update invoice", 500);
  }
}
