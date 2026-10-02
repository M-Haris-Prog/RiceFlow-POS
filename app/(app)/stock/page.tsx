import { prisma } from "@/lib/db";

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default async function StockPage() {
  const varieties = await prisma.variety.findMany({ orderBy: { name: "asc" } });
  const totalValue = varieties.reduce((sum, v) => sum + v.currentStockKg * v.avgCostPerKg, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Balance Stock</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {varieties.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No varieties recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Variety</th>
                  <th className="px-4 py-2 font-medium">Current Stock (kg)</th>
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
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-4 py-2" colSpan={3}>
                    Total stock value
                  </td>
                  <td className="px-4 py-2">{formatNumber(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
