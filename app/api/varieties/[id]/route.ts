import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { varietyUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const variety = await prisma.variety.findUnique({ where: { id } });
  if (!variety) {
    return NextResponse.json({ error: "Variety not found" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name !== variety.name) {
    const clash = await prisma.variety.findUnique({ where: { name: parsed.data.name } });
    if (clash) {
      return NextResponse.json(
        { error: "A variety with this name already exists" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.variety.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category === "" ? null : parsed.data.category,
      pricePerKg: parsed.data.pricePerKg,
      reorderLevel: parsed.data.reorderLevel,
    },
  });

  return NextResponse.json({ ok: true, variety: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const variety = await prisma.variety.findUnique({ where: { id } });
  if (!variety) {
    return NextResponse.json({ error: "Variety not found" }, { status: 404 });
  }

  if (variety.currentStockKg > 0) {
    return NextResponse.json(
      { error: `Can't delete ${variety.name} — it still has ${variety.currentStockKg}kg in stock.` },
      { status: 409 }
    );
  }

  const [purchaseCount, saleItemCount] = await Promise.all([
    prisma.purchase.count({ where: { varietyId: id } }),
    prisma.saleItem.count({ where: { varietyId: id } }),
  ]);

  if (purchaseCount > 0 || saleItemCount > 0) {
    return NextResponse.json(
      { error: `Can't delete ${variety.name} — it has purchase/sale history.` },
      { status: 409 }
    );
  }

  await prisma.variety.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
