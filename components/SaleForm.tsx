"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Variety {
  id: string;
  name: string;
  currentStockKg: number;
  avgCostPerKg: number;
}

function todayInputValue() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function SaleForm() {
  const router = useRouter();
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [varietyName, setVarietyName] = useState("");
  const [qtyKg, setQtyKg] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [saleDate, setSaleDate] = useState(todayInputValue());
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadVarieties() {
    const data = await fetch("/api/varieties").then((r) => r.json());
    setVarieties(data.varieties ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVarieties().catch(() => {});
  }, []);

  const selectedVariety = useMemo(
    () =>
      varieties.find((v) => v.name.toLowerCase() === varietyName.trim().toLowerCase()) ?? null,
    [varieties, varietyName]
  );

  const exceedsStock =
    selectedVariety !== null && qtyKg !== "" && Number(qtyKg) > selectedVariety.currentStockKg;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          varietyName,
          qtyKg: Number(qtyKg),
          ratePerKg: Number(ratePerKg),
          saleDate,
          customerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record sale");
        return;
      }
      setSuccess(`Recorded: ${qtyKg}kg of ${varietyName} sold.`);
      setQtyKg("");
      setRatePerKg("");
      setCustomerName("");
      router.refresh();
      await loadVarieties();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Variety</label>
        <input
          list="variety-options"
          required
          value={varietyName}
          onChange={(e) => setVarietyName(e.target.value)}
          placeholder="e.g. Basmati"
          className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <datalist id="variety-options">
          {varieties.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>
        {selectedVariety && (
          <p className="mt-1 text-xs text-slate-500">
            Available: <span className="font-medium">{selectedVariety.currentStockKg}kg</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantity (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={qtyKg}
            onChange={(e) => setQtyKg(e.target.value)}
            className={`h-12 w-full rounded-lg border px-3 focus:outline-none focus:ring-2 ${
              exceedsStock
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
            }`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rate (per kg)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={ratePerKg}
            onChange={(e) => setRatePerKg(e.target.value)}
            className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>

      {exceedsStock && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Only {selectedVariety?.currentStockKg}kg of {varietyName} in stock.
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          required
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Customer <span className="text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 px-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-emerald-600 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Record Sale"}
      </button>
    </form>
  );
}
