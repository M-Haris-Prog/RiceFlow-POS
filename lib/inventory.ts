import { prisma } from "@/lib/db";
import { packagingLabel, type Packaging } from "@/lib/packaging";

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
  packaging: Packaging;
  qtyKg: number;
  ratePerKg: number;
  sellingPricePerKg?: number | null;
  purchaseDate: Date;
  supplierName?: string | null;
  createdById: string;
}

// Adds stock to one variety in one kind of packaging (Bag or Open), creating either if needed,
// and recalculates that packaging's average cost.
export async function recordPurchase(input: RecordPurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const variety = await tx.variety.upsert({
      where: { name: input.varietyName },
      update: {},
      create: { name: input.varietyName },
    });

    const stock = await tx.stockItem.upsert({
      where: { varietyId_packaging: { varietyId: variety.id, packaging: input.packaging } },
      update: {},
      create: {
        varietyId: variety.id,
        packaging: input.packaging,
        pricePerKg: input.sellingPricePerKg && input.sellingPricePerKg > 0 ? input.sellingPricePerKg : 0,
      },
    });

    // If this stock was deleted earlier, buying it again brings it back starting from zero.
    const heldKg = stock.archivedAt ? 0 : stock.currentStockKg;
    const heldCost = stock.archivedAt ? 0 : stock.avgCostPerKg;
    const newStock = heldKg + input.qtyKg;
    const newAvgCost = (heldKg * heldCost + input.qtyKg * input.ratePerKg) / newStock;

    const purchase = await tx.purchase.create({
      data: {
        varietyId: variety.id,
        packaging: input.packaging,
        qtyKg: input.qtyKg,
        ratePerKg: input.ratePerKg,
        totalCost: input.qtyKg * input.ratePerKg,
        supplierName: input.supplierName || null,
        purchaseDate: input.purchaseDate,
        createdById: input.createdById,
      },
    });

    const updateData: {
      currentStockKg: number;
      avgCostPerKg: number;
      archivedAt: null;
      pricePerKg?: number;
    } = {
      currentStockKg: newStock,
      avgCostPerKg: newAvgCost,
      archivedAt: null,
    };

    if (input.sellingPricePerKg !== undefined && input.sellingPricePerKg !== null && input.sellingPricePerKg > 0) {
      updateData.pricePerKg = input.sellingPricePerKg;
    }

    await tx.stockItem.update({
      where: { id: stock.id },
      data: updateData,
    });

    return purchase;
  });
}

export type DiscountType = "AMOUNT" | "PERCENT";
export type PaymentMethod = "CASH" | "CARD" | "WALLET" | "CREDIT";

interface BillLineInput {
  varietyName: string;
  packaging: Packaging;
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
      packaging: Packaging;
      qtyKg: number;
      ratePerKg: number;
      totalRevenue: number;
      costAtSale: number;
      profit: number;
    }[] = [];

    for (const item of input.items) {
      const label = `${item.varietyName} (${packagingLabel(item.packaging)})`;
      const variety = await tx.variety.findUnique({ where: { name: item.varietyName } });
      const stock = variety
        ? await tx.stockItem.findUnique({
            where: { varietyId_packaging: { varietyId: variety.id, packaging: item.packaging } },
          })
        : null;

      if (!variety || !stock || stock.currentStockKg < item.qtyKg) {
        throw new InsufficientStockError(label, stock?.currentStockKg ?? 0, item.qtyKg);
      }

      const costAtSale = stock.avgCostPerKg * item.qtyKg;
      const totalRevenue = item.qtyKg * item.ratePerKg;

      lineItems.push({
        varietyId: variety.id,
        packaging: item.packaging,
        qtyKg: item.qtyKg,
        ratePerKg: item.ratePerKg,
        totalRevenue,
        costAtSale,
        profit: totalRevenue - costAtSale,
      });

      await tx.stockItem.update({
        where: { id: stock.id },
        data: { currentStockKg: stock.currentStockKg - item.qtyKg },
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
            packaging: i.packaging,
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
