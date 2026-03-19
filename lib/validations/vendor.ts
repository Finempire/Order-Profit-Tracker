import { z } from "zod";

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
});

export type VendorFormValues = z.infer<typeof vendorSchema>;
