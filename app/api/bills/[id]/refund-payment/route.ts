import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { refundPaymentSchema } from "@/lib/validation";
import { recordRefundPayment, ReturnError } from "@/lib/returns";

// Pays a customer some or all of the refund the shop still owes them. Owners and cashiers can both do this,
// on any bill where money is still owed (the rule is that something must be owed, not that the bill is from today).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = refundPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await recordRefundPayment({
      billId: id,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ReturnError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
