"use client";

import { useEffect, useState } from "react";
import { formatNumber, todayInputValue } from "@/lib/format";

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
  billCount: number;
  refundTotal: number;
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
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Daily Sales Report</h1>

      <div className="max-w-xs">
        <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading...</p>}

      {report && !loading && report.refundTotal > 0 && (
        <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
          ↩ Rs {formatNumber(report.refundTotal)} was refunded to customers on this day. The figures below already have the
          returned rice taken off. Details are in Bill history.
        </p>
      )}

      {report && !loading && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {report.rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">No sales recorded on this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-4 py-2 font-medium">Variety</th>
                    <th className="px-4 py-2 font-medium">Qty Sold (kg)</th>
                    <th className="px-4 py-2 font-medium">Revenue</th>
                    <th className="px-4 py-2 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.varietyName} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                        {row.varietyName}
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        {formatNumber(row.qtyKg)}
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        {formatNumber(row.revenue)}
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        {formatNumber(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] font-semibold">
                    <td className="px-4 py-2 text-[var(--foreground)]">Total</td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(report.totals.qtyKg)}
                    </td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(report.totals.revenue)}
                    </td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(report.totals.profit)}
                    </td>
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
