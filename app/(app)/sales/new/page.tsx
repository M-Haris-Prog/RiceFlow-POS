"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import { accentColorFor } from "@/lib/colors";
import type { ReceiptData } from "@/lib/receipt";
import ReceiptPrint from "@/components/ReceiptPrint";
import ShopHeader from "@/components/ShopHeader";

const AUTO_PRINT_KEY = "rice-shop:auto-print";

interface Variety {
  id: string;
  name: string;
  category: string | null;
  currentStockKg: number;
  pricePerKg: number;
}

interface CartLine {
  varietyId: string;
  varietyName: string;
  qtyKg: number;
  ratePerKg: number;
}

type DiscountType = "AMOUNT" | "PERCENT";
type PaymentMethod = "CASH" | "CARD" | "WALLET" | "CREDIT";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "WALLET", label: "Wallet / bank" },
  { value: "CREDIT", label: "Credit" },
];

// Quick-pick kilo amounts shown under each item on the slip.
const QUICK_KG = [1, 5, 10, 25, 50];

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NewBillPage() {
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("AMOUNT");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [nextBillNumber, setNextBillNumber] = useState<number | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  function changeAutoPrint(on: boolean) {
    setAutoPrint(on);
    try {
      localStorage.setItem(AUTO_PRINT_KEY, on ? "1" : "0");
    } catch {
      // The setting just won't be remembered.
    }
  }

  async function loadVarieties() {
    const data = await fetch("/api/varieties").then((r) => r.json());
    setVarieties(data.varieties ?? []);
  }

  async function loadNextBillNumber() {
    const data = await fetch("/api/bills").then((r) => r.json());
    setNextBillNumber(data.nextBillNumber ?? null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVarieties().catch(() => {});
    loadNextBillNumber().catch(() => {});
    // today's date is only known client-side to avoid an SSR/client locale hydration mismatch
    setDateLabel(todayLabel());
    try {
      setAutoPrint(localStorage.getItem(AUTO_PRINT_KEY) === "1");
    } catch {
      // Storage unavailable: keep auto-print off.
    }
  }, []);

  const colorByVariety = useMemo(() => {
    const map = new Map<string, string>();
    varieties.forEach((v, i) => map.set(v.id, accentColorFor(i)));
    return map;
  }, [varieties]);

  const filteredVarieties = varieties.filter(
    (v) =>
      search.trim() === "" ||
      v.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (v.category ?? "").toLowerCase().includes(search.trim().toLowerCase())
  );

  function addToCart(variety: Variety) {
    setSuccess(null);
    setLastReceipt(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.varietyId === variety.id);
      if (existing) {
        return prev.map((l) =>
          l.varietyId === variety.id ? { ...l, qtyKg: l.qtyKg + 1 } : l
        );
      }
      return [
        ...prev,
        {
          varietyId: variety.id,
          varietyName: variety.name,
          qtyKg: 1,
          ratePerKg: variety.pricePerKg,
        },
      ];
    });
  }

  function updateLine(index: number, field: "qtyKg" | "ratePerKg", value: string) {
    const num = Number(value);
    setCart((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: Number.isNaN(num) ? 0 : num } : l))
    );
  }

  function setQty(index: number, qty: number) {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, qtyKg: qty } : l)));
  }

  // The minus button never takes a line below 1 kg (use the box or ✕ for that).
  function stepQty(index: number, delta: number) {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = l.qtyKg + delta;
        return delta < 0 && next < 1 ? l : { ...l, qtyKg: next };
      })
    );
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function clearBill() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountType("AMOUNT");
    setDiscountValue("");
    setPaymentMethod("CASH");
    setAmountReceived("");
    setError(null);
    setSuccess(null);
    setLastReceipt(null);
  }

  const subtotal = cart.reduce((sum, l) => sum + l.qtyKg * l.ratePerKg, 0);
  const discountNum = Number(discountValue || 0);
  const discountAmount = discountType === "PERCENT" ? (subtotal * discountNum) / 100 : discountNum;
  const total = Math.max(0, subtotal - discountAmount);
  const paid = amountReceived.trim() === "" ? total : Number(amountReceived);
  const changeDue = paid - total;

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (cart.length === 0) {
      setError("Add at least one item to the bill.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({
            varietyName: l.varietyName,
            qtyKg: l.qtyKg,
            ratePerKg: l.ratePerKg,
          })),
          customerName,
          customerPhone,
          discountType,
          discountValue: discountNum,
          paymentMethod,
          amountReceived: amountReceived.trim() === "" ? null : Number(amountReceived),
          billDate: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete sale");
        return;
      }
      setSuccess(`Bill #${data.bill.billNumber} completed.`);
      setLastReceipt(data.receipt);
      if (autoPrint) {
        // Give the receipt a moment to render before opening the print dialog.
        setTimeout(() => window.print(), 300);
      }
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountType("AMOUNT");
      setDiscountValue("");
      setPaymentMethod("CASH");
      setAmountReceived("");
      await Promise.all([loadVarieties(), loadNextBillNumber()]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">New bill</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Tap a variety to add it. Change kilos or rate on the slip.
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variety..."
          className="mb-4 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredVarieties.map((v) => {
            const color = colorByVariety.get(v.id) ?? "#6ee7a0";
            return (
              <button
                key={v.id}
                onClick={() => addToCart(v)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <p className="font-medium text-[var(--foreground)]">{v.name}</p>
                {v.category && <p className="text-xs text-[var(--muted)]">{v.category}</p>}
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {formatNumber(v.pricePerKg)}
                  <span className="text-xs font-normal text-[var(--muted)]"> /kg</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {formatNumber(v.currentStockKg)} kg in stock
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-[380px]">
        <div className="receipt-paper mb-3 rounded-sm p-5 pb-7 text-sm">
          <ShopHeader />
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between text-xs">
            <span>Bill #{nextBillNumber ?? "..."}</span>
            <span>{dateLabel}</span>
          </div>

          <div className="my-3">
            {cart.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-500">
                No items yet.
                <br />
                Tap a rice variety to start.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((line, i) => (
                  <div key={line.varietyId} className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{line.varietyName}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => stepQty(i, -1)}
                          aria-label={`One kg less of ${line.varietyName}`}
                          className="h-7 w-7 rounded border border-neutral-300 bg-white text-base leading-none text-neutral-900 hover:bg-neutral-100"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          aria-label={`Kilos of ${line.varietyName}`}
                          value={line.qtyKg}
                          onChange={(e) => updateLine(i, "qtyKg", e.target.value)}
                          className="h-7 w-14 rounded border border-neutral-300 bg-white px-1 text-center text-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={() => stepQty(i, 1)}
                          aria-label={`One kg more of ${line.varietyName}`}
                          className="h-7 w-7 rounded border border-neutral-300 bg-white text-base leading-none text-neutral-900 hover:bg-neutral-100"
                        >
                          +
                        </button>
                        <span>kg ×</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={line.ratePerKg}
                          onChange={(e) => updateLine(i, "ratePerKg", e.target.value)}
                          className="h-7 w-20 rounded border border-neutral-300 bg-white px-1 text-neutral-900"
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {QUICK_KG.map((kg) => {
                          const inStock =
                            varieties.find((v) => v.id === line.varietyId)?.currentStockKg ?? 0;
                          const active = line.qtyKg === kg;
                          return (
                            <button
                              key={kg}
                              type="button"
                              disabled={kg > inStock}
                              onClick={() => setQty(i, kg)}
                              title={kg > inStock ? `Only ${inStock} kg in stock` : undefined}
                              className={`h-6 rounded border px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-35 ${
                                active
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {kg} kg
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="w-16 text-right font-medium">
                      {formatNumber(line.qtyKg * line.ratePerKg)}
                    </p>
                    <button
                      onClick={() => removeLine(i)}
                      aria-label={`Remove ${line.varietyName}`}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between text-xs">
            <span>Subtotal</span>
            <span>Rs {formatNumber(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span>Discount</span>
              <span>- Rs {formatNumber(discountAmount)}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>Rs {formatNumber(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Paid ({PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label})</span>
            <span>Rs {formatNumber(paid)}</span>
          </div>
          {changeDue !== 0 && (
            <div className="flex justify-between text-xs text-neutral-600">
              <span>{changeDue > 0 ? "Change" : "Due"}</span>
              <span>Rs {formatNumber(Math.abs(changeDue))}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Customer name
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Phone</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Discount
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
                Discount type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="AMOUNT">Amount</option>
                <option value="PERCENT">Percent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Payment</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`h-11 rounded-lg border text-xs font-medium ${
                    paymentMethod === opt.value
                      ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-black"
                      : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
              Amount received (leave empty if exact)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>

          {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
          {success && (
            <p className="rounded-lg bg-[var(--accent-strong)]/15 px-3 py-2 text-sm text-[var(--accent)]">
              {success}
            </p>
          )}
          {lastReceipt && (
            <>
              <ReceiptPrint receipt={lastReceipt} />
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 w-full rounded-lg border border-[var(--accent-strong)] font-medium text-[var(--accent)] hover:bg-[var(--accent-strong)]/10"
              >
                🖨 Print receipt for Bill #{lastReceipt.billNumber}
              </button>
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => changeAutoPrint(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-strong)]"
            />
            Print the receipt automatically after each sale
          </label>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Complete sale & make receipt"}
          </button>
          <button
            onClick={clearBill}
            type="button"
            className="h-11 w-full rounded-lg border border-[var(--border)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            Clear bill
          </button>
        </div>
      </div>
    </div>
  );
}
