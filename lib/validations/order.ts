import { z } from "zod";

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR - Indian Rupee (Base)" },
  { code: "USD", symbol: "$", label: "USD - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR - Euro" },
  { code: "GBP", symbol: "£", label: "GBP - British Pound" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const orderItemSchema = z.object({
  id: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  qty: z.number().positive("Qty must be > 0"),
  rate: z.number().positive("Rate must be > 0"),
  discount: z.number().min(0).default(0),
});

export const orderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  orderDate: z.coerce.date(),
  shippingDate: z.coerce.date().optional().nullable(),
  buyerId: z.string().min(1, "Please select a buyer"),
  notes: z.string().optional(),
  currency: z.string().default("INR"),
  exchangeRate: z.number().min(0.0001).default(1),
  items: z
    .array(orderItemSchema)
    .min(1, "Add at least one item"),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
export type OrderItemFormValues = z.infer<typeof orderItemSchema>;
