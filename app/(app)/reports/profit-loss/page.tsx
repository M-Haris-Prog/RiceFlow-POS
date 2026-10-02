"use client";

import { useEffect, useState } from "react";

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
}

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function todayInputValue() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
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
      <h1 className="text-xl font-semibold text-slate-900">Profit &amp; Loss</h1>

      <div className="grid max-w-md grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Revenue" value={formatNumber(report.totals.revenue)} />
            <StatCard label="Cost of Goods Sold" value={formatNumber(report.totals.cogs)} />
            <StatCard label="Gross Profit" value={formatNumber(report.totals.profit)} />
            <StatCard label="Purchases (cost)" value={formatNumber(report.totals.purchaseCost)} />
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {report.rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No purchases or sales in this range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
                      <tr key={row.varietyName} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {row.varietyName}
                        </td>
                        <td className="px-4 py-2">{formatNumber(row.qtySold)}</td>
                        <td className="px-4 py-2">{formatNumber(row.revenue)}</td>
                        <td className="px-4 py-2">{formatNumber(row.cogs)}</td>
                        <td className="px-4 py-2">{formatNumber(row.profit)}</td>
                        <td className="px-4 py-2">{formatNumber(row.qtyPurchased)}</td>
                        <td className="px-4 py-2">{formatNumber(row.purchaseCost)}</td>
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
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
