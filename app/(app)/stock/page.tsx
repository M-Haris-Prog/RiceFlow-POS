"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { accentColorFor } from "@/lib/colors";
import VarietyModal, { type VarietyFormValues } from "@/components/VarietyModal";

interface Variety {
  id: string;
  name: string;
  category: string | null;
  currentStockKg: number;
  avgCostPerKg: number;
  pricePerKg: number;
  reorderLevel: number;
}

const EMPTY_FORM: VarietyFormValues = {
  name: "",
  category: "",
  pricePerKg: "",
  reorderLevel: "",
  openingStockKg: "",
  costPerKg: "",
};

export default function StockPage() {
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Variety | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/varieties").then((r) => r.json());
    setVarieties(data.varieties ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load().catch(() => {});
  }, []);

  const colorByVariety = useMemo(() => {
    const map = new Map<string, string>();
    varieties.forEach((v, i) => map.set(v.id, accentColorFor(i)));
    return map;
  }, [varieties]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    varieties.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ["All types", ...Array.from(set).sort()];
  }, [varieties]);

  const maxStock = useMemo(
    () => varieties.reduce((max, v) => Math.max(max, v.currentStockKg), 0),
    [varieties]
  );

  const filtered = varieties.filter((v) => {
    const matchesSearch =
      search.trim() === "" ||
      v.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (v.category ?? "").toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = typeFilter === "All types" || v.category === typeFilter;
    return matchesSearch && matchesType;
  });

  const totals = {
    varietyCount: varieties.length,
    totalStockKg: varieties.reduce((s, v) => s + v.currentStockKg, 0),
    stockValueAtCost: varieties.reduce((s, v) => s + v.currentStockKg * v.avgCostPerKg, 0),
    stockValueAtPrice: varieties.reduce((s, v) => s + v.currentStockKg * v.pricePerKg, 0),
    needRestocking: varieties.filter((v) => v.reorderLevel > 0 && v.currentStockKg < v.reorderLevel)
      .length,
  };

  async function handleCreate(values: VarietyFormValues) {
    const res = await fetch("/api/varieties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        pricePerKg: Number(values.pricePerKg || 0),
        reorderLevel: Number(values.reorderLevel || 0),
        openingStockKg: Number(values.openingStockKg || 0),
        costPerKg: Number(values.costPerKg || 0),
      }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Could not add variety";
    setShowAdd(false);
    await load();
    return null;
  }

  async function handleEdit(values: VarietyFormValues) {
    if (!editing) return "Nothing to update";
    const res = await fetch(`/api/varieties/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        pricePerKg: Number(values.pricePerKg || 0),
        reorderLevel: Number(values.reorderLevel || 0),
      }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Could not update variety";
    setEditing(null);
    await load();
    return null;
  }

  async function handleDelete(variety: Variety) {
    setActionError(null);
    if (!confirm(`Delete ${variety.name}? This can't be undone.`)) return;
    const res = await fetch(`/api/varieties/${variety.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Could not delete variety");
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Stock</h1>
          <p className="text-sm text-[var(--muted)]">
            Every variety, what it costs you, and what you sell it for.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="h-10 shrink-0 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-medium text-black hover:brightness-110"
        >
          Add variety
        </button>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <Metric value={totals.varietyCount} label="varieties" />
        <Metric value={`${formatNumber(totals.totalStockKg)} kg`} label="total rice in shop" />
        <Metric value={`Rs ${formatNumber(totals.stockValueAtCost)}`} label="stock value at cost" />
        <Metric
          value={`Rs ${formatNumber(totals.stockValueAtPrice)}`}
          label="stock value at selling price"
        />
        <Metric value={totals.needRestocking} label="need restocking" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variety or category..."
          className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{actionError}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">No varieties match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2 font-medium">Variety</th>
                  <th className="px-4 py-2 font-medium">In stock</th>
                  <th className="px-4 py-2 font-medium">Cost/kg</th>
                  <th className="px-4 py-2 font-medium">Price/kg</th>
                  <th className="px-4 py-2 font-medium">Profit/kg</th>
                  <th className="px-4 py-2 font-medium">Stock value</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const profitPerKg = v.pricePerKg - v.avgCostPerKg;
                  const margin = v.pricePerKg > 0 ? (profitPerKg / v.pricePerKg) * 100 : 0;
                  const barPercent = maxStock > 0 ? (v.currentStockKg / maxStock) * 100 : 0;
                  const color = colorByVariety.get(v.id) ?? "#6ee7a0";
                  return (
                    <tr key={v.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{v.name}</p>
                            {v.category && (
                              <p className="text-xs text-[var(--muted)]">{v.category}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        <p>{formatNumber(v.currentStockKg)} kg</p>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPercent}%`, backgroundColor: color }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        {formatNumber(v.avgCostPerKg)}
                      </td>
                      <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                        {formatNumber(v.pricePerKg)}
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        <p>{formatNumber(profitPerKg)}</p>
                        <p className="text-xs text-[var(--muted)]">{formatNumber(margin)}% margin</p>
                      </td>
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        Rs {formatNumber(v.currentStockKg * v.avgCostPerKg)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <Link
                            href={`/purchases/new?variety=${encodeURIComponent(v.name)}`}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                          >
                            Stock
                          </Link>
                          <button
                            onClick={() => setEditing(v)}
                            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="rounded-lg border border-red-900 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <VarietyModal
          title="Add variety"
          showStockFields
          submitLabel="Add variety"
          initialValues={EMPTY_FORM}
          onClose={() => setShowAdd(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <VarietyModal
          title={`Edit ${editing.name}`}
          submitLabel="Save changes"
          initialValues={{
            name: editing.name,
            category: editing.category ?? "",
            pricePerKg: String(editing.pricePerKg),
            reorderLevel: String(editing.reorderLevel),
            openingStockKg: "",
            costPerKg: "",
          }}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-[var(--foreground)]">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
