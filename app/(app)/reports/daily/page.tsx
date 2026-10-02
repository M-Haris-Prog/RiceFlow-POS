"use client";

import { useEffect, useState } from "react";

interface DailyReportRow {
  varietyName: string;
  qtyKg: number;
  revenue: number;
  profit: number;
}

interface DailyReport {
  date: string;
  rows: DailyReportRow[];
  totals: { qtyKg: number; revenue: number; profit: number };
  saleCount: number;
}

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function todayInputValue() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function DailyReportPage() {
  const [date, setDate] = useState(todayInputValue());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for a fetch triggered by `date` changing
    setLoading(true);
    fetch(`/api/reports/daily?date=${date}`)
      .then((r) => r.json())
      .then((d) => setReport(d))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Daily Sales Report</h1>

      <div className="max-w-xs">
        <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}

      {report && !loading && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {report.rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No sales recorded on this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">Variety</th>
                    <th className="px-4 py-2 font-medium">Qty Sold (kg)</th>
                    <th className="px-4 py-2 font-medium">Revenue</th>
                    <th className="px-4 py-2 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.varietyName} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">{row.varietyName}</td>
                      <td className="px-4 py-2">{formatNumber(row.qtyKg)}</td>
                      <td className="px-4 py-2">{formatNumber(row.revenue)}</td>
                      <td className="px-4 py-2">{formatNumber(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2">{formatNumber(report.totals.qtyKg)}</td>
                    <td className="px-4 py-2">{formatNumber(report.totals.revenue)}</td>
                    <td className="px-4 py-2">{formatNumber(report.totals.profit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
