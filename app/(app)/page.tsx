import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getDailySalesReport } from "@/lib/reports";
import { formatNumber } from "@/lib/format";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user?.role !== "OWNER") {
    redirect("/sales/new");
  }

  const [varieties, today] = await Promise.all([
    prisma.variety.findMany({ orderBy: { name: "asc" } }),
    getDailySalesReport(new Date()),
  ]);

  const totalStockValue = varieties.reduce(
    (sum, v) => sum + v.currentStockKg * v.avgCostPerKg,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's Sales (kg)" value={formatNumber(today.totals.qtyKg)} />
        <StatCard label="Today's Revenue" value={formatNumber(today.totals.revenue)} />
        <StatCard label="Today's Profit" value={formatNumber(today.totals.profit)} />
        <StatCard label="Total Stock Value" value={formatNumber(totalStockValue)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Stock by Variety</h2>
        </div>
        {varieties.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">
            No varieties yet. Record a purchase to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2 font-medium">Variety</th>
                  <th className="px-4 py-2 font-medium">Stock (kg)</th>
                  <th className="px-4 py-2 font-medium">Avg Cost/kg</th>
                  <th className="px-4 py-2 font-medium">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {varieties.map((v) => (
                  <tr key={v.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2 font-medium text-[var(--foreground)]">{v.name}</td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(v.currentStockKg)}
                    </td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(v.avgCostPerKg)}
                    </td>
                    <td className="px-4 py-2 text-[var(--foreground)]">
                      {formatNumber(v.currentStockKg * v.avgCostPerKg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
