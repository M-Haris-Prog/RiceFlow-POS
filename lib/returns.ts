import { prisma } from "@/lib/db";

// A problem the person at the counter can fix (bad quantity etc.), shown as-is.
export class ReturnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnError";
  }
}

const EPS = 1e-6;
const money = (n: number) => Math.round(n * 100) / 100;

// What one kilo of a bill line is worth to the customer after the bill's discount,
// and how much of the discount sits on each kilo.
export function perKgValue(
  item: { qtyKg: number; totalRevenue: number },
  bill: { subtotal: number; discountAmount: number }
) {
  const discountShare = bill.subtotal > 0 ? (bill.discountAmount * item.totalRevenue) / bill.subtotal : 0;
  return {
    refundPerKg: (item.totalRevenue - discountShare) / item.qtyKg,
    discountPerKg: discountShare / item.qtyKg,
  };
}

interface RecordReturnInput {
  billId: string;
  items: { saleItemId: string; qtyKg: number }[];
  note?: string | null;
  createdById: string;
}

// Takes rice back from a bill: the kilos return to stock (in the same Bag/Open stock, at the cost they
// were sold at), the money to give back is worked out, and the reports are adjusted. One transaction.
export async function recordReturn(input: RecordReturnInput) {
  // Same item listed twice counts once.
  const wanted = new Map<string, number>();
  for (const i of input.items) {
    if (i.qtyKg > 0) wanted.set(i.saleItemId, (wanted.get(i.saleItemId) ?? 0) + i.qtyKg);
  }
  if (wanted.size === 0) {
    throw new ReturnError("Choose how many kilos are being returned.");
  }

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({
      where: { id: input.billId },
      include: { items: { include: { variety: true } }, returns: { select: { dueReduced: true } } },
    });
    if (!bill) {
      throw new ReturnError("Bill not found.");
    }

    const lines: {
      saleItemId: string;
      qtyKg: number;
      refundAmount: number;
      revenueReversed: number;
      costReversed: number;
      profitReversed: number;
      discountReversed: number;
    }[] = [];

    for (const [saleItemId, qtyKg] of wanted) {
      const item = bill.items.find((i) => i.id === saleItemId);
      if (!item) {
        throw new ReturnError("One of those items is not on this bill.");
      }
      const label = `${item.variety.name} (${item.packaging === "BAG" ? "Bag" : "Open"})`;
      const remaining = item.qtyKg - item.returnedKg;
      if (qtyKg > remaining + EPS) {
        throw new ReturnError(
          remaining <= EPS
            ? `${label} has already been returned in full.`
            : `Only ${money(remaining)} kg of ${label} can still be returned.`
        );
      }

      const fraction = qtyKg / item.qtyKg;
      const { refundPerKg, discountPerKg } = perKgValue(item, bill);
      lines.push({
        saleItemId,
        qtyKg,
        refundAmount: money(refundPerKg * qtyKg),
        revenueReversed: item.totalRevenue * fraction,
        costReversed: item.costAtSale * fraction,
        profitReversed: item.profit * fraction,
        discountReversed: discountPerKg * qtyKg,
      });

      // Put the rice back on the shelf at the cost it was sold at.
      const costPerKg = item.costAtSale / item.qtyKg;
      const stock = await tx.stockItem.findUnique({
        where: { varietyId_packaging: { varietyId: item.varietyId, packaging: item.packaging } },
      });
      if (!stock) {
        await tx.stockItem.create({
          data: {
            varietyId: item.varietyId,
            packaging: item.packaging,
            currentStockKg: qtyKg,
            avgCostPerKg: costPerKg,
          },
        });
      } else {
        // If this stock was deleted since the sale, the returned rice brings it back.
        const heldKg = stock.archivedAt ? 0 : stock.currentStockKg;
        const heldCost = stock.archivedAt ? 0 : stock.avgCostPerKg;
        const newStock = heldKg + qtyKg;
        await tx.stockItem.update({
          where: { id: stock.id },
          data: {
            currentStockKg: newStock,
            avgCostPerKg: (heldKg * heldCost + qtyKg * costPerKg) / newStock,
            archivedAt: null,
          },
        });
      }

      await tx.saleItem.update({ where: { id: saleItemId }, data: { returnedKg: { increment: qtyKg } } });
    }

    const refundAmount = money(lines.reduce((sum, l) => sum + l.refundAmount, 0));

    // If the customer still owed money on this bill, the refund first cancels that debt;
    // only the rest is handed back as cash.
    const alreadyCancelled = bill.returns.reduce((sum, r) => sum + r.dueReduced, 0);
    const stillOwed = Math.max(0, bill.amountDue - alreadyCancelled);
    const dueReduced = money(Math.min(stillOwed, refundAmount));
    const cashRefunded = money(refundAmount - dueReduced);

    return tx.billReturn.create({
      data: {
        billId: bill.id,
        refundAmount,
        dueReduced,
        cashRefunded,
        note: input.note || null,
        createdById: input.createdById,
        items: { create: lines },
      },
      include: {
        createdBy: { select: { displayName: true } },
        bill: { select: { billNumber: true, customerName: true } },
        items: { include: { saleItem: { include: { variety: true } } } },
      },
    });
  });
}
