import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { varietyCreateSchema } from "@/lib/validation";
import { recordPurchase } from "@/lib/inventory";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const varieties = await prisma.variety.findMany({ orderBy: { name: "asc" } });

  // Cashiers get what they need to make a bill, but never the cost price.
  if (user.role === "CASHIER") {
    return NextResponse.json({
      varieties: varieties.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        currentStockKg: v.currentStockKg,
        pricePerKg: v.pricePerKg,
      })),
    });
  }

  return NextResponse.json({ varieties });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = varietyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.variety.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "A variety with this name already exists" }, { status: 409 });
  }

  await prisma.variety.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      pricePerKg: parsed.data.pricePerKg,
      reorderLevel: parsed.data.reorderLevel,
    },
  });

  // Opening stock goes through the normal purchase path so stock, average cost
  // and the purchase history/reports all stay consistent.
  if (parsed.data.openingStockKg > 0) {
    await recordPurchase({
      varietyName: parsed.data.name,
      qtyKg: parsed.data.openingStockKg,
      ratePerKg: parsed.data.costPerKg,
      purchaseDate: new Date(),
      supplierName: "Opening stock",
      createdById: user.id,
    });
  }

  const variety = await prisma.variety.findUnique({ where: { name: parsed.data.name } });
  return NextResponse.json({ ok: true, variety });
}
