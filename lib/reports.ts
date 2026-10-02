import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export interface DailyReportRow {
  varietyName: string;
  qtyKg: number;
  revenue: number;
  profit: number;
}

export async function getDailySalesReport(date: Date) {
  const from = startOfDay(date);
  const to = endOfDay(date);

  const items = await prisma.saleItem.findMany({
    where: { bill: { billDate: { gte: from, lte: to } } },
    include: { variety: true },
    orderBy: { bill: { billDate: "asc" } },
  });

  const byVariety = new Map<string, DailyReportRow>();
  for (const item of items) {
    const existing = byVariety.get(item.varietyId) ?? {
      varietyName: item.variety.name,
      qtyKg: 0,
      revenue: 0,
      profit: 0,
    };
    existing.qtyKg += item.qtyKg;
    existing.revenue += item.totalRevenue;
    existing.profit += item.profit;
    byVariety.set(item.varietyId, existing);
  }

  const rows = Array.from(byVariety.values()).sort((a, b) =>
    a.varietyName.localeCompare(b.varietyName)
  );
  const totals = rows.reduce(
    (acc, r) => ({
      qtyKg: acc.qtyKg + r.qtyKg,
      revenue: acc.revenue + r.revenue,
      profit: acc.profit + r.profit,
    }),
    { qtyKg: 0, revenue: 0, profit: 0 }
  );

  const billCount = await prisma.bill.count({ where: { billDate: { gte: from, lte: to } } });

  return { date: from, rows, totals, billCount };
}

export interface ProfitLossRow {
  varietyName: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  profit: number;
  qtyPurchased: number;
  purchaseCost: number;
}

export async function getProfitLossReport(from: Date, to: Date) {
  const rangeFrom = startOfDay(from);
  const rangeTo = endOfDay(to);

  const [saleItems, purchases] = await Promise.all([
    prisma.saleItem.findMany({
      where: { bill: { billDate: { gte: rangeFrom, lte: rangeTo } } },
      include: { variety: true },
    }),
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: rangeFrom, lte: rangeTo } },
      include: { variety: true },
    }),
  ]);

  const byVariety = new Map<string, ProfitLossRow>();
  const getRow = (varietyId: string, varietyName: string): ProfitLossRow => {
    const existing = byVariety.get(varietyId);
    if (existing) return existing;
    const fresh: ProfitLossRow = {
      varietyName,
      qtySold: 0,
      revenue: 0,
      cogs: 0,
      profit: 0,
      qtyPurchased: 0,
      purchaseCost: 0,
    };
    byVariety.set(varietyId, fresh);
    return fresh;
  };

  for (const item of saleItems) {
    const row = getRow(item.varietyId, item.variety.name);
    row.qtySold += item.qtyKg;
    row.revenue += item.totalRevenue;
    row.cogs += item.costAtSale;
    row.profit += item.profit;
  }

  for (const purchase of purchases) {
    const row = getRow(purchase.varietyId, purchase.variety.name);
    row.qtyPurchased += purchase.qtyKg;
    row.purchaseCost += purchase.totalCost;
  }

  const rows = Array.from(byVariety.values()).sort((a, b) =>
    a.varietyName.localeCompare(b.varietyName)
  );
  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
      profit: acc.profit + r.profit,
      purchaseCost: acc.purchaseCost + r.purchaseCost,
    }),
    { revenue: 0, cogs: 0, profit: 0, purchaseCost: 0 }
  );

  return { from: rangeFrom, to: rangeTo, rows, totals };
}
