import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { expenseSchema } from "@/lib/validation";
import { endOfShopDay, middayOfShopDay, shopDayString, startOfShopDay } from "@/lib/dates";
import { getExpenseSummary } from "@/lib/expenses";

// Expenses are for owners only.
async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "OWNER") {
    return { error: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if ((fromParam && !startOfShopDay(fromParam)) || (toParam && !startOfShopDay(toParam))) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const from = startOfShopDay(fromParam ?? undefined)!;
  const to = endOfShopDay(toParam ?? undefined)!;

  const [expenses, summary, known] = await Promise.all([
    prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      include: { createdBy: { select: { displayName: true } } },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
    getExpenseSummary(from, to),
    prisma.expense.findMany({ distinct: ["category"], select: { category: true } }),
  ]);

  return NextResponse.json({
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      note: e.note,
      day: shopDayString(e.expenseDate),
      createdBy: e.createdBy.displayName,
    })),
    total: summary.total,
    byCategory: summary.byCategory,
    // Every category used so far, so custom ones show up as quick-picks too.
    knownCategories: known.map((k) => k.category),
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const expenseDate = middayOfShopDay(parsed.data.expenseDate);
  if (!expenseDate) {
    return NextResponse.json({ error: "Choose a valid date" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      expenseDate,
      createdById: auth.user.id,
    },
  });
  return NextResponse.json({ ok: true, id: expense.id });
}
