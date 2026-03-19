import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { prisma } from "./db";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateRequestNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `REQ-${year}${month}${day}`;

  const lastRequest = await prisma.purchaseRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" },
  });

  let seq = 1;
  if (lastRequest) {
    const lastSeq = parseInt(lastRequest.requestNumber.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

export function successResponse(data: unknown, message = "OK", status = 200) {
  return Response.json({ success: true, data, message, error: null }, { status });
}

export function errorResponse(error: string, status = 400) {
  return Response.json({ success: false, data: null, message: error, error }, { status });
}

export function unauthorizedResponse() {
  return Response.json(
    { success: false, data: null, message: "Unauthorized", error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbiddenResponse() {
  return Response.json(
    { success: false, data: null, message: "Forbidden", error: "Forbidden" },
    { status: 403 }
  );
}
