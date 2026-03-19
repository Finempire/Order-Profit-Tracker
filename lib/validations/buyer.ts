import { z } from "zod";

export const buyerSchema = z.object({
  name: z.string().min(1, "Buyer name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  shippingAddress: z.string().optional(),
  gstin: z.string().optional(),
});

export type BuyerFormValues = z.infer<typeof buyerSchema>;
