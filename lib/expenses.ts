import { prisma } from "@/lib/db";

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
  count: number;
}

// Total spent between two moments, and how it splits by category (biggest first).
export async function getExpenseSummary(from: Date, to: Date) {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { expenseDate: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const byCategory: ExpenseCategoryTotal[] = rows
    .map((r) => ({ category: r.category, total: r._sum.amount ?? 0, count: r._count._all }))
    .sort((a, b) => b.total - a.total);
  const total = byCategory.reduce((sum, r) => sum + r.total, 0);
  return { total, byCategory };
}
