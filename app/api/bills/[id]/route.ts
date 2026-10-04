import { NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { toReceipt } from "@/lib/receipt";

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
    },
  });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  if (user.role === "CASHIER") {
    const today = bill.billDate >= startOfDay(new Date()) && bill.billDate <= endOfDay(new Date());
    if (!today) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    return NextResponse.json({ receipt: toReceipt(bill) });
  }

  const cost = bill.items.reduce((sum, i) => sum + i.costAtSale, 0);
  const itemsProfit = bill.items.reduce((sum, i) => sum + i.profit, 0);
  return NextResponse.json({
    receipt: toReceipt(bill),
    owner: { cost, profit: itemsProfit - bill.discountAmount },
  });
}
