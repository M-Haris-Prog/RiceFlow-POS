import { NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { returnSchema } from "@/lib/validation";
import { recordReturn, ReturnError } from "@/lib/returns";
import { toReturnSlip } from "@/lib/receipt";

// Refund: takes rice back from a bill. Owners can refund any bill; cashiers only today's.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const bill = await prisma.bill.findUnique({ where: { id }, select: { billDate: true } });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  if (user.role === "CASHIER") {
    const today = bill.billDate >= startOfDay(new Date()) && bill.billDate <= endOfDay(new Date());
    if (!today) {
      return NextResponse.json(
        { error: "Only an owner can refund an older bill." },
        { status: 403 }
      );
    }
  }

  try {
    const result = await recordReturn({
      billId: id,
      items: parsed.data.items,
      note: parsed.data.note || null,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, slip: toReturnSlip(result) });
  } catch (err) {
    if (err instanceof ReturnError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
