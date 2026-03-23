import { z } from "zod";

export const requestSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  orderItemId: z.string().optional().nullable(),
  requestType: z.enum(["MATERIAL", "EXPENSE"], {
    error: "Request type is required",
  }),
  description: z.string().min(1, "Description is required"),
  qty: z.number().positive("Qty must be > 0"),
  rate: z.number().positive("Rate must be > 0"),
});

export const poItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  qty: z.number().positive("Qty must be > 0"),
  unit: z.string().default("pcs"),
  rate: z.number().min(0, "Rate must be >= 0"),
});

export const poRequestSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  orderItemId: z.string().optional().nullable(),
  requestType: z.enum(["MATERIAL", "EXPENSE"]),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
  items: z.array(poItemSchema).min(1, "At least one item is required"),
});

export const approveRequestSchema = z.object({});

export const rejectRequestSchema = z.object({
  rejectionNote: z
    .string()
    .min(1, "Rejection note is required")
    .max(500, "Max 500 characters"),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
export type PORequestFormValues = z.infer<typeof poRequestSchema>;
export type POItemFormValues = z.infer<typeof poItemSchema>;
export type RejectRequestValues = z.infer<typeof rejectRequestSchema>;
