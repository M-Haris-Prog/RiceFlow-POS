import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { varietyCreateSchema } from "@/lib/validation";
import { recordPurchase } from "@/lib/inventory";
import { packagingLabel } from "@/lib/packaging";

// One entry per variety AND packaging (Bag / Open). `id` is the id of that stock entry.
function toStockEntry(
  s: {
    id: string;
    varietyId: string;
    packaging: string;
    currentStockKg: number;
    avgCostPerKg: number;
    pricePerKg: number;
    reorderLevel: number;
    variety: { name: string; category: string | null };
  },
  includeCost: boolean
) {
  return {
    id: s.id,
    varietyId: s.varietyId,
    name: s.variety.name,
    category: s.variety.category,
    packaging: s.packaging,
    currentStockKg: s.currentStockKg,
    pricePerKg: s.pricePerKg,
    ...(includeCost ? { avgCostPerKg: s.avgCostPerKg, reorderLevel: s.reorderLevel } : {}),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = await prisma.stockItem.findMany({
    include: { variety: true },
    orderBy: [{ variety: { name: "asc" } }, { packaging: "asc" }],
  });

  // Cashiers get what they need to make a bill, but never the cost price.
  return NextResponse.json({
    varieties: stocks.map((s) => toStockEntry(s, user.role === "OWNER")),
  });
}

// Adds a variety, or adds a new packaging (Bag/Open) to a variety that already exists.
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
  const data = parsed.data;

  const existing = await prisma.variety.findUnique({
    where: { name: data.name },
    include: { stocks: true },
  });
  if (existing?.stocks.some((s) => s.packaging === data.packaging)) {
    return NextResponse.json(
      { error: `${data.name} already exists in ${packagingLabel(data.packaging)}` },
      { status: 409 }
    );
  }

  const variety = existing
    ? await prisma.variety.update({
        where: { id: existing.id },
        data: data.category ? { category: data.category } : {},
      })
    : await prisma.variety.create({
        data: { name: data.name, category: data.category || null },
      });

  await prisma.stockItem.create({
    data: {
      varietyId: variety.id,
      packaging: data.packaging,
      pricePerKg: data.pricePerKg,
      reorderLevel: data.reorderLevel,
    },
  });

  // Opening stock goes through the normal purchase path so stock, average cost
  // and the purchase history/reports all stay consistent.
  if (data.openingStockKg > 0) {
    await recordPurchase({
      varietyName: data.name,
      packaging: data.packaging,
      qtyKg: data.openingStockKg,
      ratePerKg: data.costPerKg,
      purchaseDate: new Date(),
      supplierName: "Opening stock",
      createdById: user.id,
    });
  }

  const stock = await prisma.stockItem.findUnique({
    where: { varietyId_packaging: { varietyId: variety.id, packaging: data.packaging } },
    include: { variety: true },
  });
  return NextResponse.json({ ok: true, variety: stock ? toStockEntry(stock, true) : null });
}
