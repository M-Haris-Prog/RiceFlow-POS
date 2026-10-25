import { NextResponse } from "next/server";
import { isToday } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { toReceipt, toReturnSlip, type ReturnableItem } from "@/lib/receipt";
import { perKgValue, returnOwed } from "@/lib/returns";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      items: { include: { variety: true } },
      createdBy: { select: { displayName: true } },
      returns: {
        orderBy: { returnDate: "asc" },
        include: {
          payments: { orderBy: { paidAt: "asc" } },
          createdBy: { select: { displayName: true } },
          bill: { select: { billNumber: true, customerName: true } },
          items: { include: { saleItem: { include: { variety: true } } } },
        },
      },
    },
  });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  // What the shop still owes this customer from refunds on this bill.
  const refundOwed = Math.round(bill.returns.reduce((sum, r) => sum + returnOwed(r).owed, 0) * 100) / 100;

  // Cashiers open today's bills, and any older bill where a customer is still owed money back.
  if (user.role === "CASHIER") {
    if (!isToday(bill.billDate) && refundOwed <= 0) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  }

  const returnable: ReturnableItem[] = bill.items.map((i) => ({
    saleItemId: i.id,
    varietyName: i.variety.name,
    packaging: i.packaging,
    qtyKg: i.qtyKg,
    returnedKg: i.returnedKg,
    refundPerKg: perKgValue(i, bill).refundPerKg,
  }));

  const refunded = bill.returns.reduce((sum, r) => sum + r.refundAmount, 0);
  const dueNow = Math.max(0, bill.amountDue - bill.returns.reduce((sum, r) => sum + r.dueReduced, 0));

  const common = {
    receipt: toReceipt(bill),
    returnable,
    returns: bill.returns.map(toReturnSlip),
    refunded,
    dueNow,
    refundOwed,
  };

  if (user.role === "CASHIER") {
    return NextResponse.json(common);
  }

  // Owner figures, after any refunds: cost of the rice actually kept by customers, and profit after discount.
  const ret = bill.returns.flatMap((r) => r.items);
  const cost = bill.items.reduce((s, i) => s + i.costAtSale, 0) - ret.reduce((s, i) => s + i.costReversed, 0);
  const profit =
    bill.items.reduce((s, i) => s + i.profit, 0) -
    ret.reduce((s, i) => s + i.profitReversed, 0) -
    (bill.discountAmount - ret.reduce((s, i) => s + i.discountReversed, 0));
  return NextResponse.json({ ...common, owner: { cost, profit } });
}
