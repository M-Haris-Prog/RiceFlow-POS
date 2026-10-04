import { prisma } from "@/lib/db";

export class InsufficientStockError extends Error {
  varietyName: string;
  available: number;
  requested: number;

  constructor(varietyName: string, available: number, requested: number) {
    super(`Only ${available}kg of ${varietyName} in stock (requested ${requested}kg).`);
    this.name = "InsufficientStockError";
    this.varietyName = varietyName;
    this.available = available;
    this.requested = requested;
  }
}

interface RecordPurchaseInput {
  varietyName: string;
  qtyKg: number;
  ratePerKg: number;
  purchaseDate: Date;
  supplierName?: string | null;
  createdById: string;
}

export async function recordPurchase(input: RecordPurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const variety = await tx.variety.upsert({
      where: { name: input.varietyName },
      update: {},
      create: { name: input.varietyName, currentStockKg: 0, avgCostPerKg: 0 },
    });

    const newStock = variety.currentStockKg + input.qtyKg;
    const newAvgCost =
      (variety.currentStockKg * variety.avgCostPerKg + input.qtyKg * input.ratePerKg) /
      newStock;

    const purchase = await tx.purchase.create({
      data: {
        varietyId: variety.id,
        qtyKg: input.qtyKg,
        ratePerKg: input.ratePerKg,
        totalCost: input.qtyKg * input.ratePerKg,
        supplierName: input.supplierName || null,
        purchaseDate: input.purchaseDate,
        createdById: input.createdById,
      },
    });

    await tx.variety.update({
      where: { id: variety.id },
      data: { currentStockKg: newStock, avgCostPerKg: newAvgCost },
    });

    return purchase;
  });
}

export type DiscountType = "AMOUNT" | "PERCENT";
export type PaymentMethod = "CASH" | "CARD" | "WALLET" | "CREDIT";

interface BillLineInput {
  varietyName: string;
  qtyKg: number;
  ratePerKg: number;
}

interface RecordBillInput {
  items: BillLineInput[];
  customerName?: string | null;
  customerPhone?: string | null;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number | null;
  billDate: Date;
  createdById: string;
}

export async function recordBill(input: RecordBillInput) {
  if (input.items.length === 0) {
    throw new Error("A bill needs at least one item.");
  }

  return prisma.$transaction(async (tx) => {
    const lineItems: {
      varietyId: string;
      varietyName: string;
      qtyKg: number;
      ratePerKg: number;
      totalRevenue: number;
      costAtSale: number;
      profit: number;
    }[] = [];

    for (const item of input.items) {
      const variety = await tx.variety.findUnique({ where: { name: item.varietyName } });
      if (!variety || variety.currentStockKg < item.qtyKg) {
        throw new InsufficientStockError(
          item.varietyName,
          variety?.currentStockKg ?? 0,
          item.qtyKg
        );
      }

      const costAtSale = variety.avgCostPerKg * item.qtyKg;
      const totalRevenue = item.qtyKg * item.ratePerKg;

      lineItems.push({
        varietyId: variety.id,
        varietyName: variety.name,
        qtyKg: item.qtyKg,
        ratePerKg: item.ratePerKg,
        totalRevenue,
        costAtSale,
        profit: totalRevenue - costAtSale,
      });

      await tx.variety.update({
        where: { id: variety.id },
        data: { currentStockKg: variety.currentStockKg - item.qtyKg },
      });
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.totalRevenue, 0);
    const discountAmount =
      input.discountType === "PERCENT"
        ? (subtotal * input.discountValue) / 100
        : input.discountValue;
    const total = Math.max(0, subtotal - discountAmount);
    const amountReceived = input.amountReceived ?? total;
    const amountDue = Math.max(0, total - amountReceived);

    const lastBill = await tx.bill.findFirst({ orderBy: { billNumber: "desc" } });
    const billNumber = (lastBill?.billNumber ?? 1000) + 1;

    const bill = await tx.bill.create({
      data: {
        billNumber,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount,
        total,
        paymentMethod: input.paymentMethod,
        amountReceived,
        amountDue,
        billDate: input.billDate,
        createdById: input.createdById,
        items: {
          create: lineItems.map((i) => ({
            varietyId: i.varietyId,
            qtyKg: i.qtyKg,
            ratePerKg: i.ratePerKg,
            totalRevenue: i.totalRevenue,
            costAtSale: i.costAtSale,
            profit: i.profit,
          })),
        },
      },
      include: {
        items: { include: { variety: true } },
        createdBy: { select: { displayName: true } },
      },
    });

    return bill;
  });
}
