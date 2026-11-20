"use client";

import { useState, type FormEvent } from "react";

export interface VarietyFormValues {
  name: string;
  category: string;
  pricePerKg?: string;
  reorderLevel?: string;
  packaging?: string;
  openingStockKg?: string;
  costPerKg?: string;
  currentStockKg?: string;
  entries?: {
    packaging: "BAG" | "OPEN";
    pricePerKg: string;
    reorderLevel: string;
    openingStockKg: string;
    costPerKg: string;
  }[];
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
  const [name, setName] = useState(initialValues.name);
  const [category, setCategory] = useState(initialValues.category);

  // Single edit mode states (when editing one stock item)
  const [currentStockKg, setCurrentStockKg] = useState(initialValues.currentStockKg ?? "");
  const [singlePrice, setSinglePrice] = useState(initialValues.pricePerKg ?? "");
  const [singleReorder, setSingleReorder] = useState(initialValues.reorderLevel ?? "");

  // Add mode: Side-by-side Bag and Open states
  const [bagActive, setBagActive] = useState(true);
  const [openActive, setOpenActive] = useState(true);

  // Bag fields
  const [bagPrice, setBagPrice] = useState(initialValues.pricePerKg ?? "");
  const [bagOpeningStock, setBagOpeningStock] = useState("");
  const [bagCost, setBagCost] = useState("");
  const [bagReorder, setBagReorder] = useState(initialValues.reorderLevel ?? "");

  // Open fields
  const [openPrice, setOpenPrice] = useState(initialValues.pricePerKg ?? "");
  const [openOpeningStock, setOpenOpeningStock] = useState("");
  const [openCost, setOpenCost] = useState("");
  const [openReorder, setOpenReorder] = useState(initialValues.reorderLevel ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (showStockFields) {
      if (!bagActive && !openActive) {
        setError("Please enable at least Bag or Open stock.");
        return;
      }

      const entries: {
        packaging: "BAG" | "OPEN";
        pricePerKg: string;
        reorderLevel: string;
        openingStockKg: string;
        costPerKg: string;
      }[] = [];

      if (bagActive) {
        if (Number(bagOpeningStock || 0) > 0 && Number(bagCost || 0) <= 0) {
          setError("Enter the purchase cost per kg for Bag opening stock.");
          return;
        }
        entries.push({
          packaging: "BAG",
          pricePerKg: bagPrice,
          reorderLevel: bagReorder,
          openingStockKg: bagOpeningStock,
          costPerKg: bagCost,
        });
      }

      if (openActive) {
        if (Number(openOpeningStock || 0) > 0 && Number(openCost || 0) <= 0) {
          setError("Enter the purchase cost per kg for Open opening stock.");
          return;
        }
        entries.push({
          packaging: "OPEN",
          pricePerKg: openPrice,
          reorderLevel: openReorder,
          openingStockKg: openOpeningStock,
          costPerKg: openCost,
        });
      }

      setSaving(true);
      const result = await onSubmit({
        name,
        category,
        entries,
      });
      setSaving(false);
      if (result) setError(result);
      return;
    }

    // Edit mode
    setSaving(true);
    const result = await onSubmit({
      name,
      category,
      currentStockKg,
      pricePerKg: singlePrice,
      reorderLevel: singleReorder,
      packaging: initialValues.packaging,
    });
    setSaving(false);
    if (result) {
      setError(result);
    }
  }

  const isWide = showStockFields;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 ${
          isWide ? "max-w-2xl" : "max-w-sm"
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Variety Name & Category */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Variety Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Super Basmati"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Category <span className="text-[var(--muted)]">(optional)</span>
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Steam, Long grain"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>

          {/* EDIT MODE: Editing a single packaging */}
          {showCurrentStock && (
            <div className="flex flex-col gap-3">
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
                  value={currentStockKg}
                  onChange={(e) => setCurrentStockKg(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Correct the count here. To add newly bought rice, use the Stock button instead.
                </p>
              </div>

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
                    value={singlePrice}
                    onChange={(e) => setSinglePrice(e.target.value)}
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
                    value={singleReorder}
                    onChange={(e) => setSingleReorder(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ADD MODE: Side-by-Side Bag & Open Panels */}
          {showStockFields && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Packaging Options (Add either or both side-by-side)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* BAG PANEL */}
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    bagActive
                      ? "border-[var(--border)] bg-[var(--background)]"
                      : "border-dashed border-[var(--border)]/60 bg-[var(--surface-hover)]/30 opacity-70"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      🎒 Bag Stock (Sealed)
                    </span>
                    <button
                      type="button"
                      onClick={() => setBagActive(!bagActive)}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        bagActive
                          ? "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--danger-text)]"
                          : "border border-[var(--accent)] text-[var(--accent)]"
                      }`}
                    >
                      {bagActive ? "✕ Close" : "+ Enable"}
                    </button>
                  </div>

                  {bagActive ? (
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          Selling Price / kg
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          required={bagActive}
                          value={bagPrice}
                          onChange={(e) => setBagPrice(e.target.value)}
                          placeholder="e.g. 240"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            Opening kg <span className="text-[10px]">(opt)</span>
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={bagOpeningStock}
                            onChange={(e) => setBagOpeningStock(e.target.value)}
                            placeholder="0"
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            Cost / kg
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={bagCost}
                            onChange={(e) => setBagCost(e.target.value)}
                            placeholder="Cost"
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          Low-stock alert (kg)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={bagReorder}
                          onChange={(e) => setBagReorder(e.target.value)}
                          placeholder="25"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-[var(--muted)]">
                      Bag stock closed.
                    </p>
                  )}
                </div>

                {/* OPEN PANEL */}
                <div
                  className={`rounded-xl border p-4 transition-all ${
                    openActive
                      ? "border-[var(--border)] bg-[var(--background)]"
                      : "border-dashed border-[var(--border)]/60 bg-[var(--surface-hover)]/30 opacity-70"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      🌾 Open Stock (Loose)
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenActive(!openActive)}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        openActive
                          ? "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--danger-text)]"
                          : "border border-[var(--accent)] text-[var(--accent)]"
                      }`}
                    >
                      {openActive ? "✕ Close" : "+ Enable"}
                    </button>
                  </div>

                  {openActive ? (
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          Selling Price / kg
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          required={openActive}
                          value={openPrice}
                          onChange={(e) => setOpenPrice(e.target.value)}
                          placeholder="e.g. 235"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            Opening kg <span className="text-[10px]">(opt)</span>
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={openOpeningStock}
                            onChange={(e) => setOpenOpeningStock(e.target.value)}
                            placeholder="0"
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            Cost / kg
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={openCost}
                            onChange={(e) => setOpenCost(e.target.value)}
                            placeholder="Cost"
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          Low-stock alert (kg)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={openReorder}
                          onChange={(e) => setOpenReorder(e.target.value)}
                          placeholder="25"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-[var(--muted)]">
                      Open stock closed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
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
              className="h-11 flex-1 rounded-lg bg-[var(--accent-strong)] font-semibold text-black hover:brightness-110 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : showStockFields && bagActive && openActive
                ? "Add Both (Bag & Open)"
                : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
