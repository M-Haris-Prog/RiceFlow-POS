"use client";

import { useEffect, useState } from "react";
import { formatNumber, todayInputValue } from "@/lib/format";

interface ProfitLossRow {
  varietyName: string;
  qtySold: number;
  revenue: number;
  cogs: number;
  profit: number;
  qtyPurchased: number;
  purchaseCost: number;
}

interface ProfitLossReport {
  from: string;
  to: string;
  rows: ProfitLossRow[];
  totals: { revenue: number; cogs: number; profit: number; purchaseCost: number };
  expenses: { total: number; byCategory: { category: string; total: number; count: number }[] };
  netProfit: number;
}

function firstOfMonthInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState(firstOfMonthInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for a fetch triggered by date range changing
    setLoading(true);
    fetch(`/api/reports/profit-loss?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setReport(d))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Profit &amp; Loss</h1>

      <div className="grid max-w-md grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Revenue" value={formatNumber(report.totals.revenue)} />
            <StatCard label="Cost of Goods Sold" value={formatNumber(report.totals.cogs)} />
            <StatCard label="Gross Profit" value={formatNumber(report.totals.profit)} />
            <StatCard label="Expenses" value={formatNumber(report.expenses.total)} />
            <StatCard label="Net Profit" value={formatNumber(report.netProfit)} />
            <StatCard label="Purchases (cost)" value={formatNumber(report.totals.purchaseCost)} />
          </div>
          <p className="text-xs text-[var(--muted)]">
            Net profit = gross profit minus expenses (fuel, food, etc.). Purchases are not counted as
            expenses: the rice you buy is already in the cost of goods sold when it is sold.
          </p>

          {report.expenses.byCategory.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Expenses by type</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {report.expenses.byCategory.map((c) => (
                    <tr key={c.category} className="border-t border-[var(--border)] first:border-t-0">
                      <td className="px-4 py-2 font-medium text-[var(--foreground)]">{c.category}</td>
                      <td className="px-4 py-2 text-[var(--muted)]">{c.count} entries</td>
                      <td className="px-4 py-2 text-right text-[var(--foreground)]">
                        {formatNumber(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {report.rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--muted)]">
                No purchases or sales in this range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-4 py-2 font-medium">Variety</th>
                      <th className="px-4 py-2 font-medium">Sold (kg)</th>
                      <th className="px-4 py-2 font-medium">Revenue</th>
                      <th className="px-4 py-2 font-medium">COGS</th>
                      <th className="px-4 py-2 font-medium">Profit</th>
                      <th className="px-4 py-2 font-medium">Purchased (kg)</th>
                      <th className="px-4 py-2 font-medium">Purchase Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.varietyName} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                          {row.varietyName}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.qtySold)}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.revenue)}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.cogs)}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.profit)}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.qtyPurchased)}
                        </td>
                        <td className="px-4 py-2 text-[var(--foreground)]">
                          {formatNumber(row.purchaseCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
