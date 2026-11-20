import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { bulkPurchaseSchema, purchaseSchema } from "@/lib/validation";
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

  if (body && Array.isArray(body.entries)) {
    const parsed = bulkPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const purchases = [];
    for (const entry of parsed.data.entries) {
      const p = await recordPurchase({
        varietyName: parsed.data.varietyName,
        packaging: entry.packaging,
        qtyKg: entry.qtyKg,
        ratePerKg: entry.ratePerKg,
        sellingPricePerKg: entry.sellingPricePerKg,
        purchaseDate: parsed.data.purchaseDate,
        supplierName: parsed.data.supplierName || null,
        createdById: user.id,
      });
      purchases.push(p);
    }

    return NextResponse.json({ ok: true, purchases, purchase: purchases[0] });
  }

  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const purchase = await recordPurchase({
    varietyName: parsed.data.varietyName,
    packaging: parsed.data.packaging,
    qtyKg: parsed.data.qtyKg,
    ratePerKg: parsed.data.ratePerKg,
    sellingPricePerKg: parsed.data.sellingPricePerKg,
    purchaseDate: parsed.data.purchaseDate,
    supplierName: parsed.data.supplierName || null,
    createdById: user.id,
  });

  return NextResponse.json({ ok: true, purchase, purchases: [purchase] });
}
