"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { todayInputValue } from "@/lib/format";
import {
  PACKAGING_OPTIONS,
  PACKAGING_VALUES,
  packagingLabel,
  type Packaging,
} from "@/lib/packaging";

interface Variety {
  id: string;
  name: string;
  currentStockKg: number;
  avgCostPerKg: number;
}

export default function PurchaseForm({
  initialVariety = "",
  initialPackaging = "",
}: {
  initialVariety?: string;
  initialPackaging?: string;
}) {
  const router = useRouter();
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [packaging, setPackaging] = useState<Packaging | "">(
    PACKAGING_VALUES.includes(initialPackaging as Packaging) ? (initialPackaging as Packaging) : ""
  );
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
    if (!packaging) {
      setError("Choose Bag or Open first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          varietyName,
          packaging,
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
      setSuccess(
        `Recorded: ${qtyKg}kg of ${varietyName} (${packagingLabel(packaging)}) added to stock.`
      );
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
        <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Packaging</label>
        <div className="grid grid-cols-2 gap-2">
          {PACKAGING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPackaging(opt.value)}
              aria-pressed={packaging === opt.value}
              className={`h-12 rounded-lg border font-medium ${
                packaging === opt.value
                  ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-black"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Is this rice in sealed bags, or loose (open)? Bag and Open are kept as separate stock.
        </p>
      </div>

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
          {Array.from(new Set(varieties.map((v) => v.name))).map((name) => (
            <option key={name} value={name} />
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

      {error && <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">{error}</p>}
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
