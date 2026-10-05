import { NextResponse } from "next/server";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const MAX_BILLS = 300;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  // Cashiers only ever see today's bills, whatever dates they ask for.
  let from: Date;
  let to: Date;
  if (user.role === "CASHIER") {
    from = startOfDay(new Date());
    to = endOfDay(new Date());
  } else {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const fromDate = fromParam ? new Date(fromParam) : subDays(new Date(), 6);
    const toDate = toParam ? new Date(toParam) : new Date();
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    from = startOfDay(fromDate);
    to = endOfDay(toDate);
  }

  const bills = await prisma.bill.findMany({
    where: { billDate: { gte: from, lte: to } },
    orderBy: { billNumber: "desc" },
    take: MAX_BILLS,
    include: {
      createdBy: { select: { displayName: true } },
      items: { select: { profit: true } },
      returns: { include: { items: true } },
    },
  });

  const rows = bills
    .filter(
      (b) =>
        q === "" ||
        String(b.billNumber).includes(q) ||
        (b.customerName ?? "").toLowerCase().includes(q) ||
        (b.customerPhone ?? "").includes(q)
    )
    .map((b) => {
      const retItems = b.returns.flatMap((r) => r.items);
      const refunded = b.returns.reduce((s, r) => s + r.refundAmount, 0);
      return {
        id: b.id,
        billNumber: b.billNumber,
        billDate: b.billDate.toISOString(),
        customerName: b.customerName,
        cashierName: b.createdBy.displayName,
        itemCount: b.items.length,
        total: b.total,
        refunded,
        // What the sale is worth after any refunds.
        netTotal: b.total - refunded,
        paymentMethod: b.paymentMethod,
        amountDue: Math.max(0, b.amountDue - b.returns.reduce((s, r) => s + r.dueReduced, 0)),
        // Profit after the bill discount and any refunds. Owners only.
        profit:
          user.role === "OWNER"
            ? b.items.reduce((s, i) => s + i.profit, 0) -
              retItems.reduce((s, i) => s + i.profitReversed, 0) -
              (b.discountAmount - retItems.reduce((s, i) => s + i.discountReversed, 0))
            : undefined,
      };
    });

  return NextResponse.json({
    role: user.role,
    truncated: bills.length === MAX_BILLS,
    totals: {
      count: rows.length,
      sales: rows.reduce((s, r) => s + r.netTotal, 0),
      refunded: rows.reduce((s, r) => s + r.refunded, 0),
      due: rows.reduce((s, r) => s + r.amountDue, 0),
      profit: user.role === "OWNER" ? rows.reduce((s, r) => s + (r.profit ?? 0), 0) : undefined,
    },
    bills: rows,
  });
}
