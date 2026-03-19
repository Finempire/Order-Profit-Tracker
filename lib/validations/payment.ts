import { z } from "zod";

export const paymentSchema = z.object({
  paidAmount: z.number().positive("Amount must be > 0"),
  paidAt: z.coerce.date(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
