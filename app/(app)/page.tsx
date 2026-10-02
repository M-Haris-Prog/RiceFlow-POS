import { prisma } from "@/lib/db";
import { getDailySalesReport } from "@/lib/reports";

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
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
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's Sales (kg)" value={formatNumber(today.totals.qtyKg)} />
        <StatCard label="Today's Revenue" value={formatNumber(today.totals.revenue)} />
        <StatCard label="Today's Profit" value={formatNumber(today.totals.profit)} />
        <StatCard label="Total Stock Value" value={formatNumber(totalStockValue)} />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Stock by Variety</h2>
        </div>
        {varieties.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No varieties yet. Record a purchase to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Variety</th>
                  <th className="px-4 py-2 font-medium">Stock (kg)</th>
                  <th className="px-4 py-2 font-medium">Avg Cost/kg</th>
                  <th className="px-4 py-2 font-medium">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {varieties.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{v.name}</td>
                    <td className="px-4 py-2">{formatNumber(v.currentStockKg)}</td>
                    <td className="px-4 py-2">{formatNumber(v.avgCostPerKg)}</td>
                    <td className="px-4 py-2">
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
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
