import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/server-utils";
import { getRelativePath } from "@/lib/upload";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

// Helper to run multer in Next.js route handlers
async function parseFormData(request: Request): Promise<{ fields: Record<string, string>; file?: { path: string; mimetype: string; size: number; originalname: string; fieldname: string } }> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  let file: { path: string; mimetype: string; size: number; originalname: string; fieldname: string } | undefined;

  const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 10 * 1024 * 1024;

  for (const [key, value] of Array.from(formData.entries())) {
    if (value instanceof File) {
      if (!allowed.includes(value.type)) {
        throw new Error("Only PDF, JPG, PNG files are allowed");
      }
      if (value.size > MAX_SIZE) {
        throw new Error("File size exceeds 10MB limit");
      }
      // Save file to disk
      const vendorName = (formData.get("vendorName") as string) || "unknown";
      const invoiceNumber = (formData.get("invoiceNumber") as string) || "unknown";
      const vendorSlug = slugify(vendorName);
      const invoiceSlug = slugify(invoiceNumber);
      const dir = path.resolve(UPLOAD_DIR, "vendors", vendorSlug, invoiceSlug);
      fs.mkdirSync(dir, { recursive: true });

      const ext = path.extname(value.name);
      const prefix = key === "invoiceFile" ? "invoice" : "payment_proof";
      const filename = `${prefix}_${Date.now()}${ext}`;
      const filePath = path.join(dir, filename);

      const buffer = Buffer.from(await value.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      file = {
        path: filePath,
        mimetype: value.type,
        size: value.size,
        originalname: value.name,
        fieldname: key,
      };
    } else {
      fields[key] = value;
    }
  }

  return { fields, file };
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId") || "";
  const requestId = searchParams.get("requestId") || "";
  const invoiceType = searchParams.get("invoiceType") || "";
  const paymentStatus = searchParams.get("paymentStatus") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;
  if (requestId) where.requestId = requestId;
  if (invoiceType) where.invoiceType = invoiceType;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [total, invoices] = await Promise.all([
    prisma.vendorInvoice.count({ where }),
    prisma.vendorInvoice.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        request: {
          select: {
            id: true,
            requestNumber: true,
            orderId: true,
            order: { select: { orderNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return successResponse({ invoices, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const ADD_ROLES = ["ADMIN", "ACCOUNTANT", "PRODUCTION"];
  if (!ADD_ROLES.includes(session.user.role || "")) {
    return Response.json({ success: false, data: null, message: "Forbidden", error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fields, file } = await parseFormData(request);
    const {
      requestId, vendorId, invoiceNumber, invoiceDate, invoiceType,
      description, qty, rate, amount, gstAmount, totalAmount,
    } = fields;

    if (!requestId || !vendorId || !invoiceNumber || !invoiceDate || !qty || !rate || !totalAmount) {
      return errorResponse("Missing required fields");
    }

    // Verify request is APPROVED
    const purchaseRequest = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!purchaseRequest) return errorResponse("Purchase request not found", 404);
    if (purchaseRequest.status !== "APPROVED") {
      return errorResponse("Invoice can only be added to APPROVED requests", 422);
    }

    const invoiceFilePath = file ? getRelativePath(file.path) : null;

    const invoice = await prisma.vendorInvoice.create({
      data: {
        requestId,
        vendorId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        invoiceType: (invoiceType || "PROVISIONAL") as "PROVISIONAL" | "TAX" | "OTHER",
        description: description || null,
        qty: parseFloat(qty),
        rate: parseFloat(rate),
        amount: parseFloat(amount),
        gstAmount: parseFloat(gstAmount || "0"),
        totalAmount: parseFloat(totalAmount),
        invoiceFilePath,
        paymentStatus: "UNPAID",
        paidAmount: 0,
      },
      include: { vendor: true, request: { include: { order: true } } },
    });

    return successResponse(invoice, "Invoice created", 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return errorResponse(message, 500);
  }
}

