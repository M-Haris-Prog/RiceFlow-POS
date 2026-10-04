import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { purchaseSchema } from "@/lib/validation";
import { recordPurchase } from "@/lib/inventory";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const purchase = await recordPurchase({
    varietyName: parsed.data.varietyName,
    qtyKg: parsed.data.qtyKg,
    ratePerKg: parsed.data.ratePerKg,
    purchaseDate: parsed.data.purchaseDate,
    supplierName: parsed.data.supplierName || null,
    createdById: user.id,
  });

  return NextResponse.json({ ok: true, purchase });
}
