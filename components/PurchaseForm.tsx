"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { todayInputValue } from "@/lib/format";

interface Variety {
  id: string;
  name: string;
  currentStockKg: number;
  avgCostPerKg: number;
}

export default function PurchaseForm({ initialVariety = "" }: { initialVariety?: string }) {
  const router = useRouter();
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [varietyName, setVarietyName] = useState(initialVariety);
  const [qtyKg, setQtyKg] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayInputValue());
  const [supplierName, setSupplierName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/varieties")
      .then((r) => r.json())
      .then((d) => setVarieties(d.varieties ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          varietyName,
          qtyKg: Number(qtyKg),
          ratePerKg: Number(ratePerKg),
          purchaseDate,
          supplierName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record purchase");
        return;
      }
      setSuccess(`Recorded: ${qtyKg}kg of ${varietyName} purchased.`);
      setQtyKg("");
      setRatePerKg("");
      setSupplierName("");
      router.refresh();
      const refreshed = await fetch("/api/varieties").then((r) => r.json());
      setVarieties(refreshed.varieties ?? []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Variety</label>
        <input
          list="variety-options"
          required
          value={varietyName}
          onChange={(e) => setVarietyName(e.target.value)}
          placeholder="e.g. Basmati"
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
        <datalist id="variety-options">
          {varieties.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Pick an existing variety or type a new one.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
            Quantity (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={qtyKg}
            onChange={(e) => setQtyKg(e.target.value)}
            className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
            Rate (per kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={ratePerKg}
            onChange={(e) => setRatePerKg(e.target.value)}
            className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Date</label>
        <input
          type="date"
          required
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
          Supplier <span className="text-[var(--muted)]">(optional)</span>
        </label>
        <input
          type="text"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      {success && (
        <p className="rounded-lg bg-[var(--accent-strong)]/15 px-3 py-2 text-sm text-[var(--accent)]">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Record Purchase"}
      </button>
    </form>
  );
}
