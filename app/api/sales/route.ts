import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { saleSchema } from "@/lib/validation";
import { recordSale, InsufficientStockError } from "@/lib/inventory";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const sale = await recordSale({
      varietyName: parsed.data.varietyName,
      qtyKg: parsed.data.qtyKg,
      ratePerKg: parsed.data.ratePerKg,
      saleDate: parsed.data.saleDate,
      customerName: parsed.data.customerName || null,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, sale });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
