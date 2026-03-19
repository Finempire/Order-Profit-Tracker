import { z } from "zod";

export const invoiceSchema = z.object({
  requestId: z.string().min(1, "Request is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  vendorName: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.coerce.date(),
  invoiceType: z.enum(["PROVISIONAL", "TAX", "OTHER"]).default("PROVISIONAL"),
  description: z.string().optional(),
  qty: z.number().positive("Qty must be > 0"),
  rate: z.number().positive("Rate must be > 0"),
  amount: z.number().nonnegative(),
  gstAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive("Total must be > 0"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
