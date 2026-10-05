import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";
import { packagingLabel } from "@/lib/packaging";

const lineLabel = (name: string, packaging: string) => `${name} (${packagingLabel(packaging)})`;

export interface DailyReportRow {
  varietyName: string;
  qtyKg: number;
  revenue: number;
  profit: number;
}

// Sales per variety and packaging for one day, minus anything refunded that day.
export async function getDailySalesReport(date: Date) {
  const from = startOfDay(date);
  const to = endOfDay(date);

  const [items, returned] = await Promise.all([
    prisma.saleItem.findMany({
      where: { bill: { billDate: { gte: from, lte: to } } },
      include: { variety: true },
      orderBy: { bill: { billDate: "asc" } },
    }),
    prisma.returnItem.findMany({
      where: { return: { returnDate: { gte: from, lte: to } } },
      include: { saleItem: { include: { variety: true } } },
    }),
  ]);

  const byVariety = new Map<string, DailyReportRow>();
  const getRow = (key: string, label: string): DailyReportRow => {
    const existing = byVariety.get(key);
    if (existing) return existing;
    const fresh: DailyReportRow = { varietyName: label, qtyKg: 0, revenue: 0, profit: 0 };
    byVariety.set(key, fresh);
    return fresh;
  };

  for (const item of items) {
    const row = getRow(
      `${item.varietyId}:${item.packaging}`,
      lineLabel(item.variety.name, item.packaging)
    );
    row.qtyKg += item.qtyKg;
    row.revenue += item.totalRevenue;
    row.profit += item.profit;
  }

  for (const r of returned) {
    const s = r.saleItem;
    const row = getRow(`${s.varietyId}:${s.packaging}`, lineLabel(s.variety.name, s.packaging));
    row.qtyKg -= r.qtyKg;
    row.revenue -= r.revenueReversed;
    row.profit -= r.profitReversed;
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
  const refundTotal = returned.reduce((sum, r) => sum + r.refundAmount, 0);

  return { date: from, rows, totals, billCount, refundTotal };
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

  const [saleItems, purchases, returned] = await Promise.all([
    prisma.saleItem.findMany({
      where: { bill: { billDate: { gte: rangeFrom, lte: rangeTo } } },
      include: { variety: true },
    }),
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: rangeFrom, lte: rangeTo } },
      include: { variety: true },
    }),
    prisma.returnItem.findMany({
      where: { return: { returnDate: { gte: rangeFrom, lte: rangeTo } } },
      include: { saleItem: { include: { variety: true } } },
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
    const row = getRow(
      `${item.varietyId}:${item.packaging}`,
      lineLabel(item.variety.name, item.packaging)
    );
    row.qtySold += item.qtyKg;
    row.revenue += item.totalRevenue;
    row.cogs += item.costAtSale;
    row.profit += item.profit;
  }

  // Rice taken back in the period comes off the sales, cost and profit.
  for (const r of returned) {
    const s = r.saleItem;
    const row = getRow(`${s.varietyId}:${s.packaging}`, lineLabel(s.variety.name, s.packaging));
    row.qtySold -= r.qtyKg;
    row.revenue -= r.revenueReversed;
    row.cogs -= r.costReversed;
    row.profit -= r.profitReversed;
  }

  for (const purchase of purchases) {
    const row = getRow(
      `${purchase.varietyId}:${purchase.packaging}`,
      lineLabel(purchase.variety.name, purchase.packaging)
    );
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
