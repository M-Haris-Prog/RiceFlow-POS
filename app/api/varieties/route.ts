import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { varietyCreateSchema } from "@/lib/validation";

export async function GET() {
  const varieties = await prisma.variety.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ varieties });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const variety = await prisma.variety.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      pricePerKg: parsed.data.pricePerKg,
      reorderLevel: parsed.data.reorderLevel,
    },
  });

  return NextResponse.json({ ok: true, variety });
}
