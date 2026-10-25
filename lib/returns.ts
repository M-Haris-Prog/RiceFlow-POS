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
  // Cash actually handed to the customer now. Leave out for "all of it"; less means the shop still owes the rest.
  cashPaidNow?: number | null;
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

    const paidNow = money(input.cashPaidNow ?? cashRefunded);
    if (paidNow < 0) {
      throw new ReturnError("The amount paid cannot be negative.");
    }
    if (paidNow > cashRefunded + EPS) {
      throw new ReturnError(`The cash to give back is only Rs ${cashRefunded}, so you cannot pay more than that.`);
    }

    return tx.billReturn.create({
      data: {
        billId: bill.id,
        refundAmount,
        dueReduced,
        cashRefunded,
        note: input.note || null,
        createdById: input.createdById,
        items: { create: lines },
        payments:
          paidNow > 0 ? { create: { amount: paidNow, createdById: input.createdById } } : undefined,
      },
      include: {
        payments: { orderBy: { paidAt: "asc" } },
        createdBy: { select: { displayName: true } },
        bill: { select: { billNumber: true, customerName: true } },
        items: { include: { saleItem: { include: { variety: true } } } },
      },
    });
  });
}

// How much of one return the shop still owes the customer in cash.
export function returnOwed(r: { cashRefunded: number; payments: { amount: number }[] }) {
  const paid = r.payments.reduce((sum, p) => sum + p.amount, 0);
  return { paid: money(paid), owed: Math.max(0, money(r.cashRefunded - paid)) };
}

// Every bill where the shop still owes a customer part of a refund.
export async function getRefundOwedSummary() {
  const returns = await prisma.billReturn.findMany({
    where: { cashRefunded: { gt: 0 } },
    select: { billId: true, cashRefunded: true, payments: { select: { amount: true } } },
  });
  const byBill = new Map<string, number>();
  for (const r of returns) {
    const { owed } = returnOwed(r);
    if (owed > EPS) byBill.set(r.billId, money((byBill.get(r.billId) ?? 0) + owed));
  }
  return {
    billIds: Array.from(byBill.keys()),
    byBill,
    count: byBill.size,
    amount: money(Array.from(byBill.values()).reduce((a, b) => a + b, 0)),
  };
}

// The shop pays a customer some (or all) of what it still owes them for refunds on a bill.
// The payment goes against the oldest refund first. One transaction.
export async function recordRefundPayment(input: {
  billId: string;
  amount: number;
  note?: string | null;
  createdById: string;
}) {
  const amount = money(input.amount);
  if (!(amount > 0)) {
    throw new ReturnError("Enter the amount being paid.");
  }

  return prisma.$transaction(async (tx) => {
    const returns = await tx.billReturn.findMany({
      where: { billId: input.billId },
      orderBy: { returnDate: "asc" },
      include: { payments: { select: { amount: true } } },
    });
    const open = returns
      .map((r) => ({ id: r.id, owed: returnOwed(r).owed }))
      .filter((r) => r.owed > EPS);
    const totalOwed = money(open.reduce((sum, r) => sum + r.owed, 0));
    if (totalOwed <= EPS) {
      throw new ReturnError("Nothing is owed to the customer on this bill.");
    }
    if (amount > totalOwed + EPS) {
      throw new ReturnError(`Only Rs ${totalOwed} is still owed to the customer.`);
    }

    let left = amount;
    for (const r of open) {
      if (left <= EPS) break;
      const part = money(Math.min(left, r.owed));
      await tx.refundPayment.create({
        data: { returnId: r.id, amount: part, note: input.note || null, createdById: input.createdById },
      });
      left = money(left - part);
    }
    return { paid: amount, stillOwed: money(totalOwed - amount) };
  });
}

// Owner-only: removes a refund as if it never happened. The rice goes back out of stock, the bill's
// returned kilos are restored, and the refund's payments disappear with it. The reports need no change
// because they are worked out from the refund records. If some of that rice has been sold since, the
// stock can't cover it and this is refused rather than letting stock go below zero.
export async function deleteReturn(returnId: string) {
  return prisma.$transaction(async (tx) => {
    const ret = await tx.billReturn.findUnique({
      where: { id: returnId },
      include: {
        bill: { select: { billNumber: true } },
        items: { include: { saleItem: { include: { variety: true } } } },
      },
    });
    if (!ret) {
      throw new ReturnError("That refund was not found. It may have been deleted already.");
    }

    for (const line of ret.items) {
      const item = line.saleItem;
      const label = `${item.variety.name} (${item.packaging === "BAG" ? "Bag" : "Open"})`;
      const stock = await tx.stockItem.findUnique({
        where: { varietyId_packaging: { varietyId: item.varietyId, packaging: item.packaging } },
      });
      const held = stock && !stock.archivedAt ? stock.currentStockKg : 0;
      if (!stock || held + EPS < line.qtyKg) {
        throw new ReturnError(
          `Can't delete this refund: it put ${money(line.qtyKg)} kg of ${label} back in stock, but only ${money(held)} kg is there now (some has been sold since).`
        );
      }

      const remainingKg = held - line.qtyKg;
      const costPerKg = item.costAtSale / item.qtyKg;
      // Take the rice out at the cost it came back in at, so the average cost goes back to what it was.
      const avgCost =
        remainingKg > EPS ? Math.max(0, (held * stock.avgCostPerKg - line.qtyKg * costPerKg) / remainingKg) : stock.avgCostPerKg;
      await tx.stockItem.update({
        where: { id: stock.id },
        data: { currentStockKg: Math.max(0, remainingKg), avgCostPerKg: avgCost },
      });
      await tx.saleItem.update({
        where: { id: item.id },
        data: { returnedKg: { decrement: line.qtyKg } },
      });
    }

    await tx.billReturn.delete({ where: { id: returnId } });
    return { billNumber: ret.bill.billNumber };
  });
}
