"use client";

import { useState, type FormEvent } from "react";
import { PACKAGING_OPTIONS } from "@/lib/packaging";

export interface VarietyFormValues {
  name: string;
  category: string;
  pricePerKg: string;
  reorderLevel: string;
  packaging: string;
  openingStockKg: string;
  costPerKg: string;
  currentStockKg: string;
}

interface VarietyModalProps {
  title: string;
  showStockFields?: boolean;
  showCurrentStock?: boolean;
  initialValues: VarietyFormValues;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: VarietyFormValues) => Promise<string | null>;
}

export default function VarietyModal({
  title,
  showStockFields = false,
  showCurrentStock = false,
  initialValues,
  submitLabel,
  onClose,
  onSubmit,
}: VarietyModalProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (showStockFields && !values.packaging) {
      setError("Choose Bag or Open first.");
      return;
    }
    setSaving(true);
    const result = await onSubmit(values);
    setSaving(false);
    if (result) {
      setError(result);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {showStockFields && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Packaging</label>
              <div className="grid grid-cols-2 gap-2">
                {PACKAGING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={values.packaging === opt.value}
                    onClick={() => setValues((v) => ({ ...v, packaging: opt.value }))}
                    className={`h-11 rounded-lg border font-medium ${
                      values.packaging === opt.value
                        ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-black"
                        : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Adding a variety that already exists in the other packaging adds this one next to it.
              </p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Name</label>
            <input
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
              Category <span className="text-[var(--muted)]">(optional)</span>
            </label>
            <input
              value={values.category}
              onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
              placeholder="e.g. Basmati, Steam, Long grain (Irri)"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>
          {showCurrentStock && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Stock in shop (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={values.currentStockKg}
                onChange={(e) => setValues((v) => ({ ...v, currentStockKg: e.target.value }))}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Use this to correct the count. To add newly bought rice, use the Stock button instead.
              </p>
            </div>
          )}
          {showStockFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                  Opening stock (kg)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={values.openingStockKg}
                  onChange={(e) => setValues((v) => ({ ...v, openingStockKg: e.target.value }))}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                  Cost per kg
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={values.costPerKg}
                  onChange={(e) => setValues((v) => ({ ...v, costPerKg: e.target.value }))}
                  placeholder="What you paid"
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Selling price/kg
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={values.pricePerKg}
                onChange={(e) => setValues((v) => ({ ...v, pricePerKg: e.target.value }))}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Low-stock alert (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={values.reorderLevel}
                onChange={(e) => setValues((v) => ({ ...v, reorderLevel: e.target.value }))}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-[var(--border)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 flex-1 rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
