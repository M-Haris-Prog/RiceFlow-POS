import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { billSchema } from "@/lib/validation";
import { recordBill, InsufficientStockError } from "@/lib/inventory";
import { toReceipt } from "@/lib/receipt";

export async function GET() {
  const lastBill = await prisma.bill.findFirst({ orderBy: { billNumber: "desc" } });
  return NextResponse.json({ nextBillNumber: (lastBill?.billNumber ?? 1000) + 1 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = billSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const bill = await recordBill({
      items: parsed.data.items,
      customerName: parsed.data.customerName || null,
      customerPhone: parsed.data.customerPhone || null,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      paymentMethod: parsed.data.paymentMethod,
      amountReceived: parsed.data.amountReceived ?? null,
      billDate: parsed.data.billDate,
      createdById: user.id,
    });
    // The receipt has no cost or profit, so it is safe for everyone. Owners also get the full record.
    const receipt = toReceipt(bill);
    if (user.role === "CASHIER") {
      return NextResponse.json({ ok: true, bill: { billNumber: bill.billNumber }, receipt });
    }
    return NextResponse.json({ ok: true, bill, receipt });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
