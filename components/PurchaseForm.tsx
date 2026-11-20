"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, todayInputValue } from "@/lib/format";
import { packagingLabel } from "@/lib/packaging";

interface Variety {
  id: string;
  name: string;
  packaging: string;
  currentStockKg: number;
  avgCostPerKg?: number;
  pricePerKg?: number;
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
  const [varietyName, setVarietyName] = useState(initialVariety);
  const [purchaseDate, setPurchaseDate] = useState(todayInputValue());
  const [supplierName, setSupplierName] = useState("");

  // Which packaging screens are active
  const [bagActive, setBagActive] = useState(initialPackaging !== "OPEN");
  const [openActive, setOpenActive] = useState(initialPackaging !== "BAG");

  // Bag inputs
  const [bagQtyKg, setBagQtyKg] = useState("");
  const [bagRatePerKg, setBagRatePerKg] = useState("");
  const [bagSellingPrice, setBagSellingPrice] = useState("");
  const [bagSellingPriceTouched, setBagSellingPriceTouched] = useState(false);

  // Open inputs
  const [openQtyKg, setOpenQtyKg] = useState("");
  const [openRatePerKg, setOpenRatePerKg] = useState("");
  const [openSellingPrice, setOpenSellingPrice] = useState("");
  const [openSellingPriceTouched, setOpenSellingPriceTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/varieties")
      .then((r) => r.json())
      .then((d) => setVarieties(d.varieties ?? []))
      .catch(() => {});
  }, []);

  // Look up existing stocks for this variety
  const bagStock = useMemo(() => {
    if (!varietyName.trim()) return undefined;
    return varieties.find(
      (v) => v.name.toLowerCase() === varietyName.trim().toLowerCase() && v.packaging === "BAG"
    );
  }, [varieties, varietyName]);

  const openStock = useMemo(() => {
    if (!varietyName.trim()) return undefined;
    return varieties.find(
      (v) => v.name.toLowerCase() === varietyName.trim().toLowerCase() && v.packaging === "OPEN"
    );
  }, [varieties, varietyName]);

  const effectiveBagSellingPrice =
    !bagSellingPriceTouched && bagStock?.pricePerKg !== undefined
      ? String(bagStock.pricePerKg)
      : bagSellingPrice;
  const effectiveOpenSellingPrice =
    !openSellingPriceTouched && openStock?.pricePerKg !== undefined
      ? String(openStock.pricePerKg)
      : openSellingPrice;

  // Bag calculations
  const numBagQty = parseFloat(bagQtyKg) || 0;
  const numBagRate = parseFloat(bagRatePerKg) || 0;
  const numBagSelling = parseFloat(effectiveBagSellingPrice) || 0;
  const bagHeldKg = bagStock ? bagStock.currentStockKg : 0;
  const bagHeldCost = bagStock ? (bagStock.avgCostPerKg ?? 0) : 0;
  const newBagTotal = bagHeldKg + numBagQty;
  const newBagAvgCost =
    newBagTotal > 0 ? (bagHeldKg * bagHeldCost + numBagQty * numBagRate) / newBagTotal : numBagRate;
  const bagProfit = numBagSelling > 0 && newBagAvgCost > 0 ? numBagSelling - newBagAvgCost : null;
  const bagProfitMargin =
    bagProfit !== null && numBagSelling > 0 ? (bagProfit / numBagSelling) * 100 : null;

  // Open calculations
  const numOpenQty = parseFloat(openQtyKg) || 0;
  const numOpenRate = parseFloat(openRatePerKg) || 0;
  const numOpenSelling = parseFloat(effectiveOpenSellingPrice) || 0;
  const openHeldKg = openStock ? openStock.currentStockKg : 0;
  const openHeldCost = openStock ? (openStock.avgCostPerKg ?? 0) : 0;
  const newOpenTotal = openHeldKg + numOpenQty;
  const newOpenAvgCost =
    newOpenTotal > 0
      ? (openHeldKg * openHeldCost + numOpenQty * numOpenRate) / newOpenTotal
      : numOpenRate;
  const openProfit =
    numOpenSelling > 0 && newOpenAvgCost > 0 ? numOpenSelling - newOpenAvgCost : null;
  const openProfitMargin =
    openProfit !== null && numOpenSelling > 0 ? (openProfit / numOpenSelling) * 100 : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!varietyName.trim()) {
      setError("Please enter or choose a variety name.");
      return;
    }

    if (!bagActive && !openActive) {
      setError("Please enable at least Bag or Open stock.");
      return;
    }

    const entries: {
      packaging: "BAG" | "OPEN";
      qtyKg: number;
      ratePerKg: number;
      sellingPricePerKg?: number;
    }[] = [];

    if (bagActive) {
      if (numBagQty <= 0 || numBagRate <= 0) {
        // If Bag is the only active one, or if user filled partially
        if (!openActive || numBagQty > 0 || numBagRate > 0) {
          setError("Enter valid quantity and rate for Bag stock, or close the Bag panel.");
          return;
        }
      } else {
        entries.push({
          packaging: "BAG",
          qtyKg: numBagQty,
          ratePerKg: numBagRate,
          sellingPricePerKg:
            effectiveBagSellingPrice.trim() !== "" ? Number(effectiveBagSellingPrice) : undefined,
        });
      }
    }

    if (openActive) {
      if (numOpenQty <= 0 || numOpenRate <= 0) {
        if (!bagActive || numOpenQty > 0 || numOpenRate > 0) {
          setError("Enter valid quantity and rate for Open stock, or close the Open panel.");
          return;
        }
      } else {
        entries.push({
          packaging: "OPEN",
          qtyKg: numOpenQty,
          ratePerKg: numOpenRate,
          sellingPricePerKg:
            effectiveOpenSellingPrice.trim() !== "" ? Number(effectiveOpenSellingPrice) : undefined,
        });
      }
    }

    if (entries.length === 0) {
      setError("Please enter quantity and purchase rate for at least one packaging (Bag or Open).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          varietyName: varietyName.trim(),
          purchaseDate,
          supplierName: supplierName.trim() || undefined,
          entries,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record purchase");
        return;
      }

      const summaries = entries.map(
        (entry) =>
          `${entry.qtyKg}kg ${packagingLabel(entry.packaging)} (avg cost Rs ${formatNumber(
            entry.packaging === "BAG" ? newBagAvgCost : newOpenAvgCost
          )}/kg)`
      );

      setSuccess(`Recorded for ${varietyName}: ${summaries.join(" and ")} added to stock.`);
      setBagQtyKg("");
      setBagRatePerKg("");
      setOpenQtyKg("");
      setOpenRatePerKg("");
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

  const submitLabel =
    bagActive && openActive
      ? "Record Purchases (Bag & Open)"
      : bagActive
      ? "Record Bag Purchase"
      : "Record Open Purchase";

  return (
    <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-6">
      {/* Variety & Common Information */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          1. Variety &amp; Supplier Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
              Variety Name
            </label>
            <input
              list="variety-options"
              required
              value={varietyName}
              onChange={(e) => setVarietyName(e.target.value)}
              placeholder="e.g. Basmati"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <datalist id="variety-options">
              {Array.from(new Set(varieties.map((v) => v.name))).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
              Purchase Date
            </label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
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
              placeholder="e.g. Waqar Traders"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Bag & Open Screens */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            2. Add Stock Side-by-Side (Bag &amp; Open)
          </h2>
          <span className="text-xs text-[var(--muted)]">
            Fill both, or close the one you don&apos;t need
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* BAG PANEL */}
          <div
            className={`rounded-xl border transition-all ${
              bagActive
                ? "border-[var(--border)] bg-[var(--surface)] p-5"
                : "border-dashed border-[var(--border)]/70 bg-[var(--surface)]/40 p-4"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎒</span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Bag Stock</h3>
                  <p className="text-xs text-[var(--muted)]">Sealed sacks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBagActive(!bagActive)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  bagActive
                    ? "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--danger-text)]"
                    : "border border-[var(--accent)]/40 bg-[var(--accent-strong)]/20 text-[var(--accent)] hover:brightness-110"
                }`}
              >
                {bagActive ? "✕ Close Bag" : "+ Enable Bag"}
              </button>
            </div>

            {bagActive ? (
              <div className="mt-4 flex flex-col gap-3.5">
                {bagStock && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs">
                    <span className="text-[var(--muted)]">Current in shop: </span>
                    <strong className="text-[var(--foreground)]">
                      {formatNumber(bagHeldKg)} kg
                    </strong>
                    <span className="mx-1 text-[var(--muted)]">|</span>
                    <span className="text-[var(--muted)]">Cost: </span>
                    <strong className="text-[var(--foreground)]">
                      Rs {formatNumber(bagHeldCost)}
                    </strong>
                    <span className="mx-1 text-[var(--muted)]">|</span>
                    <span className="text-[var(--muted)]">Price: </span>
                    <strong className="text-[var(--foreground)]">
                      Rs {formatNumber(bagStock.pricePerKg ?? 0)}
                    </strong>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Quantity (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      value={bagQtyKg}
                      onChange={(e) => setBagQtyKg(e.target.value)}
                      placeholder="e.g. 50"
                      className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Purchase Cost (per kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      value={bagRatePerKg}
                      onChange={(e) => setBagRatePerKg(e.target.value)}
                      placeholder="e.g. 200"
                      className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Selling Price (per kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={effectiveBagSellingPrice}
                    onChange={(e) => {
                      setBagSellingPriceTouched(true);
                      setBagSellingPrice(e.target.value);
                    }}
                    placeholder={bagStock ? String(bagStock.pricePerKg ?? "") : "e.g. 240"}
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>

                {numBagQty > 0 && numBagRate > 0 && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">New Bag Stock:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatNumber(newBagTotal)} kg
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-[var(--muted)]">New Avg Cost:</span>
                      <span className="font-semibold text-[var(--accent)]">
                        Rs {formatNumber(newBagAvgCost)}/kg
                      </span>
                    </div>

                    {numBagSelling > 0 && bagProfit !== null && (
                      <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
                        {bagProfit < 0 ? (
                          <span className="text-[var(--danger-text)] font-medium">
                            ⚠️ Loss: -Rs {formatNumber(Math.abs(bagProfit))}/kg
                          </span>
                        ) : (
                          <span className="text-[var(--accent)] font-medium">
                            ✓ Profit: Rs {formatNumber(bagProfit)}/kg (
                            {formatNumber(bagProfitMargin ?? 0)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                Bag stock entry is closed. Click &ldquo;+ Enable Bag&rdquo; if you have bag rice to add.
              </div>
            )}
          </div>

          {/* OPEN PANEL */}
          <div
            className={`rounded-xl border transition-all ${
              openActive
                ? "border-[var(--border)] bg-[var(--surface)] p-5"
                : "border-dashed border-[var(--border)]/70 bg-[var(--surface)]/40 p-4"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌾</span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Open Stock</h3>
                  <p className="text-xs text-[var(--muted)]">Loose rice sold by weight</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenActive(!openActive)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  openActive
                    ? "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--danger-text)]"
                    : "border border-[var(--accent)]/40 bg-[var(--accent-strong)]/20 text-[var(--accent)] hover:brightness-110"
                }`}
              >
                {openActive ? "✕ Close Open" : "+ Enable Open"}
              </button>
            </div>

            {openActive ? (
              <div className="mt-4 flex flex-col gap-3.5">
                {openStock && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs">
                    <span className="text-[var(--muted)]">Current in shop: </span>
                    <strong className="text-[var(--foreground)]">
                      {formatNumber(openHeldKg)} kg
                    </strong>
                    <span className="mx-1 text-[var(--muted)]">|</span>
                    <span className="text-[var(--muted)]">Cost: </span>
                    <strong className="text-[var(--foreground)]">
                      Rs {formatNumber(openHeldCost)}
                    </strong>
                    <span className="mx-1 text-[var(--muted)]">|</span>
                    <span className="text-[var(--muted)]">Price: </span>
                    <strong className="text-[var(--foreground)]">
                      Rs {formatNumber(openStock.pricePerKg ?? 0)}
                    </strong>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Quantity (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      value={openQtyKg}
                      onChange={(e) => setOpenQtyKg(e.target.value)}
                      placeholder="e.g. 50"
                      className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Purchase Cost (per kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      value={openRatePerKg}
                      onChange={(e) => setOpenRatePerKg(e.target.value)}
                      placeholder="e.g. 195"
                      className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Selling Price (per kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={effectiveOpenSellingPrice}
                    onChange={(e) => {
                      setOpenSellingPriceTouched(true);
                      setOpenSellingPrice(e.target.value);
                    }}
                    placeholder={openStock ? String(openStock.pricePerKg ?? "") : "e.g. 235"}
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>

                {numOpenQty > 0 && numOpenRate > 0 && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">New Open Stock:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatNumber(newOpenTotal)} kg
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-[var(--muted)]">New Avg Cost:</span>
                      <span className="font-semibold text-[var(--accent)]">
                        Rs {formatNumber(newOpenAvgCost)}/kg
                      </span>
                    </div>

                    {numOpenSelling > 0 && openProfit !== null && (
                      <div className="mt-1.5 border-t border-[var(--border)] pt-1.5">
                        {openProfit < 0 ? (
                          <span className="text-[var(--danger-text)] font-medium">
                            ⚠️ Loss: -Rs {formatNumber(Math.abs(openProfit))}/kg
                          </span>
                        ) : (
                          <span className="text-[var(--accent)] font-medium">
                            ✓ Profit: Rs {formatNumber(openProfit)}/kg (
                            {formatNumber(openProfitMargin ?? 0)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                Open stock entry is closed. Click &ldquo;+ Enable Open&rdquo; if you have loose rice to add.
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-[var(--accent-strong)]/15 px-3 py-2 text-sm text-[var(--accent)]">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-lg bg-[var(--accent-strong)] font-semibold text-black hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
