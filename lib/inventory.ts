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

interface RecordSaleInput {
  varietyName: string;
  qtyKg: number;
  ratePerKg: number;
  saleDate: Date;
  customerName?: string | null;
  createdById: string;
}

export async function recordSale(input: RecordSaleInput) {
  return prisma.$transaction(async (tx) => {
    const variety = await tx.variety.findUnique({ where: { name: input.varietyName } });

    if (!variety || variety.currentStockKg < input.qtyKg) {
      throw new InsufficientStockError(
        input.varietyName,
        variety?.currentStockKg ?? 0,
        input.qtyKg
      );
    }

    const costAtSale = variety.avgCostPerKg * input.qtyKg;
    const totalRevenue = input.qtyKg * input.ratePerKg;
    const profit = totalRevenue - costAtSale;

    const sale = await tx.sale.create({
      data: {
        varietyId: variety.id,
        qtyKg: input.qtyKg,
        ratePerKg: input.ratePerKg,
        totalRevenue,
        costAtSale,
        profit,
        customerName: input.customerName || null,
        saleDate: input.saleDate,
        createdById: input.createdById,
      },
    });

    await tx.variety.update({
      where: { id: variety.id },
      data: { currentStockKg: variety.currentStockKg - input.qtyKg },
    });

    return sale;
  });
}
