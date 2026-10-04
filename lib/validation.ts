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

export const billItemSchema = z.object({
  varietyName: z.string().trim().min(1),
  qtyKg: z.coerce.number().positive("Quantity must be greater than 0"),
  ratePerKg: z.coerce.number().min(0, "Rate can't be negative"),
});

export const billSchema = z.object({
  items: z.array(billItemSchema).min(1, "Add at least one item to the bill"),
  customerName: z.string().trim().optional().or(z.literal("")),
  customerPhone: z.string().trim().optional().or(z.literal("")),
  discountType: z.enum(["AMOUNT", "PERCENT"]),
  discountValue: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "WALLET", "CREDIT"]),
  amountReceived: z.coerce.number().min(0).optional().nullable(),
  billDate: z.coerce.date(),
});

export const varietyCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    category: z.string().trim().optional().or(z.literal("")),
    pricePerKg: z.coerce.number().min(0).default(0),
    reorderLevel: z.coerce.number().min(0).default(0),
    openingStockKg: z.coerce.number().min(0).default(0),
    costPerKg: z.coerce.number().min(0).default(0),
  })
  .refine((v) => v.openingStockKg === 0 || v.costPerKg > 0, {
    message: "Enter the cost per kg for the opening stock",
    path: ["costPerKg"],
  });

export const varietyUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  category: z.string().trim().optional().or(z.literal("")),
  pricePerKg: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  currentStockKg: z.coerce.number().min(0).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type BillInput = z.infer<typeof billSchema>;
export type VarietyCreateInput = z.infer<typeof varietyCreateSchema>;
export type VarietyUpdateInput = z.infer<typeof varietyUpdateSchema>;
