import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const purchaseSchema = z.object({
  varietyName: z.string().trim().min(1, "Variety is required"),
  qtyKg: z.coerce.number().positive("Quantity must be greater than 0"),
  ratePerKg: z.coerce.number().positive("Rate must be greater than 0"),
  purchaseDate: z.coerce.date(),
  supplierName: z.string().trim().optional().or(z.literal("")),
});

export const saleSchema = z.object({
  varietyName: z.string().trim().min(1, "Variety is required"),
  qtyKg: z.coerce.number().positive("Quantity must be greater than 0"),
  ratePerKg: z.coerce.number().positive("Rate must be greater than 0"),
  saleDate: z.coerce.date(),
  customerName: z.string().trim().optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
