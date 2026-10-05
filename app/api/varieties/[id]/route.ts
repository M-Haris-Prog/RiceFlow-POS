import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { varietyUpdateSchema } from "@/lib/validation";
import { packagingLabel } from "@/lib/packaging";

// `id` here is the id of a stock entry (one variety in one packaging), as returned by GET /api/varieties.

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = varietyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const stock = await prisma.stockItem.findUnique({ where: { id }, include: { variety: true } });
  if (!stock) {
    return NextResponse.json({ error: "Variety not found" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name !== stock.variety.name) {
    const clash = await prisma.variety.findUnique({ where: { name: parsed.data.name } });
    if (clash) {
      return NextResponse.json(
        { error: "A variety with this name already exists" },
        { status: 409 }
      );
    }
  }

  // Name and category belong to the variety (shared by Bag and Open); the rest is this packaging's.
  await prisma.variety.update({
    where: { id: stock.varietyId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category === "" ? null : parsed.data.category,
    },
  });
  const updated = await prisma.stockItem.update({
    where: { id },
    data: {
      pricePerKg: parsed.data.pricePerKg,
      reorderLevel: parsed.data.reorderLevel,
      currentStockKg: parsed.data.currentStockKg,
    },
  });

  return NextResponse.json({ ok: true, variety: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const stock = await prisma.stockItem.findUnique({ where: { id }, include: { variety: true } });
  if (!stock) {
    return NextResponse.json({ error: "Variety not found" }, { status: 404 });
  }

  const label = `${stock.variety.name} (${packagingLabel(stock.packaging)})`;

  if (stock.currentStockKg > 0) {
    return NextResponse.json(
      { error: `Can't delete ${label} — it still has ${stock.currentStockKg}kg in stock.` },
      { status: 409 }
    );
  }

  const where = { varietyId: stock.varietyId, packaging: stock.packaging };
  const [purchaseCount, saleItemCount] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.saleItem.count({ where }),
  ]);

  if (purchaseCount > 0 || saleItemCount > 0) {
    return NextResponse.json(
      { error: `Can't delete ${label} — it has purchase/sale history.` },
      { status: 409 }
    );
  }

  await prisma.stockItem.delete({ where: { id } });

  // Remove the variety itself once it has no stock entries left.
  const remaining = await prisma.stockItem.count({ where: { varietyId: stock.varietyId } });
  if (remaining === 0) {
    await prisma.variety.delete({ where: { id: stock.varietyId } });
  }

  return NextResponse.json({ ok: true });
}
