"use client";

import { useEffect, useState } from "react";
import { formatNumber, paymentLabel, todayInputValue } from "@/lib/format";
import { packagingLabel } from "@/lib/packaging";
import type { ReceiptData, ReturnableItem, ReturnSlipData } from "@/lib/receipt";
import ReceiptPrint from "@/components/ReceiptPrint";
import ReturnSlipPrint from "@/components/ReturnSlipPrint";

interface BillRow {
  id: string;
  billNumber: number;
  billDate: string;
  customerName: string | null;
  cashierName: string;
  itemCount: number;
  total: number;
  refunded: number;
  netTotal: number;
  paymentMethod: string;
  amountDue: number;
  profit?: number;
}

interface HistoryResponse {
  role: "OWNER" | "CASHIER";
  truncated: boolean;
  totals: { count: number; sales: number; refunded: number; due: number; profit?: number };
  bills: BillRow[];
}

interface Detail {
  billId: string;
  receipt: ReceiptData;
  returnable: ReturnableItem[];
  returns: ReturnSlipData[];
  refunded: number;
  dueNow: number;
  owner?: { cost: number; profit: number };
}

type Mode = "receipt" | "refund" | "slip";

const money = (n: number) => Math.round(n * 100) / 100;

function daysAgoInputValue(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BillHistoryPage() {
  const [from, setFrom] = useState(daysAgoInputValue(6));
  const [to, setTo] = useState(todayInputValue());
  const [q, setQ] = useState("");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Refund screen state
  const [mode, setMode] = useState<Mode>("receipt");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [slip, setSlip] = useState<ReturnSlipData | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for a fetch triggered by the filters changing
    setLoading(true);
    const params = new URLSearchParams({ from, to, q });
    fetch(`/api/bills/history?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [from, to, q, reloadKey]);

  async function loadDetail(id: string) {
    const res = await fetch(`/api/bills/${id}`);
    const body = await res.json();
    if (!res.ok) {
      setDetailError(body.error ?? "Could not open this bill");
      return null;
    }
    return { billId: id, ...body } as Detail;
  }

  async function openBill(id: string) {
    setDetailError(null);
    const d = await loadDetail(id);
    if (!d) return;
    setDetail(d);
    setMode("receipt");
    setSlip(null);
  }

  function closeDetail() {
    setDetail(null);
    setMode("receipt");
    setSlip(null);
    setRefundError(null);
  }

  // Start a refund with everything still returnable filled in, so one confirmation does it all.
  function startRefund() {
    if (!detail) return;
    const prefill: Record<string, string> = {};
    for (const item of detail.returnable) {
      const left = money(item.qtyKg - item.returnedKg);
      if (left > 0) prefill[item.saleItemId] = String(left);
    }
    setQty(prefill);
    setNote("");
    setRefundError(null);
    setMode("refund");
  }

  const refundableItems = detail?.returnable.filter((i) => money(i.qtyKg - i.returnedKg) > 0) ?? [];

  const refundLines = refundableItems.map((item) => {
    const left = money(item.qtyKg - item.returnedKg);
    const kg = Number(qty[item.saleItemId] ?? 0);
    const valid = Number.isFinite(kg) && kg > 0 && kg <= left + 1e-9;
    return { item, left, kg: Number.isFinite(kg) ? kg : 0, valid, amount: valid ? money(kg * item.refundPerKg) : 0 };
  });
  const refundTotal = money(refundLines.reduce((s, l) => s + l.amount, 0));
  const tooMuch = refundLines.some((l) => l.kg > l.left + 1e-9);
  const dueCancelled = detail ? Math.min(detail.dueNow, refundTotal) : 0;
  const cashBack = money(refundTotal - dueCancelled);

  async function confirmRefund() {
    if (!detail) return;
    setRefundError(null);
    const items = refundLines.filter((l) => l.valid).map((l) => ({ saleItemId: l.item.saleItemId, qtyKg: l.kg }));
    if (items.length === 0) {
      setRefundError("Enter how many kilos are being returned.");
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch(`/api/bills/${detail.billId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, note }),
      });
      const body = await res.json();
      if (!res.ok) {
        setRefundError(body.error ?? "Could not refund this bill");
        return;
      }
      setSlip(body.slip);
      setMode("slip");
      const fresh = await loadDetail(detail.billId);
      if (fresh) setDetail(fresh);
      setReloadKey((k) => k + 1);
    } catch {
      setRefundError("Something went wrong. Please try again.");
    } finally {
      setRefunding(false);
    }
  }

  const isOwner = data?.role === "OWNER";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Bill history</h1>
        <p className="text-sm text-[var(--muted)]">
          {data && !isOwner
            ? "Today's bills. Tap one to see it, print it again, or refund it."
            : "Every bill made. Tap one to see it, print it again, or refund it."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {isOwner && (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bill number, customer name or phone..."
          className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {data && (
        <div className="flex flex-wrap gap-6 text-sm">
          <Metric value={data.totals.count} label="bills" />
          <Metric value={`Rs ${formatNumber(data.totals.sales)}`} label="total sales (after refunds)" />
          {data.totals.refunded > 0 && (
            <Metric value={`Rs ${formatNumber(data.totals.refunded)}`} label="refunded" />
          )}
          <Metric value={`Rs ${formatNumber(data.totals.due)}`} label="still due" />
          {isOwner && data.totals.profit !== undefined && (
            <Metric value={`Rs ${formatNumber(data.totals.profit)}`} label="profit (after discounts)" />
          )}
        </div>
      )}

      {detailError && (
        <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">{detailError}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">Loading...</p>
        ) : !data || data.bills.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">No bills found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2 font-medium">Bill</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Payment</th>
                  {isOwner && <th className="px-4 py-2 font-medium">Profit</th>}
                  {isOwner && <th className="px-4 py-2 font-medium">By</th>}
                </tr>
              </thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => openBill(b.id)}
                    className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-2 font-medium text-[var(--foreground)]">#{b.billNumber}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--foreground)]">{formatWhen(b.billDate)}</td>
                    <td className="px-4 py-2 text-[var(--foreground)]">{b.customerName ?? "—"}</td>
                    <td className="px-4 py-2 text-[var(--foreground)]">{b.itemCount}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-[var(--foreground)]">
                      Rs {formatNumber(b.netTotal)}
                      {b.refunded > 0 && (
                        <span className="ml-2 rounded bg-[var(--danger-bg)] px-1.5 py-0.5 text-xs font-normal text-[var(--danger-text)]">
                          {b.refunded >= b.total - 0.005 ? "Fully refunded" : `Refunded ${formatNumber(b.refunded)}`}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--foreground)]">
                      {paymentLabel(b.paymentMethod)}
                      {b.amountDue > 0 && (
                        <span className="ml-2 rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-xs text-[var(--warn-text)]">
                          Due {formatNumber(b.amountDue)}
                        </span>
                      )}
                    </td>
                    {isOwner && <td className="px-4 py-2 text-[var(--foreground)]">{formatNumber(b.profit ?? 0)}</td>}
                    {isOwner && <td className="px-4 py-2 text-[var(--muted)]">{b.cashierName}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data?.truncated && (
        <p className="text-xs text-[var(--muted)]">
          Showing the latest 300 bills. Narrow the dates or search to see older ones.
        </p>
      )}

      {detail && (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6">
          <div className="flex w-full max-w-sm flex-col gap-3">
            {mode === "slip" && slip ? (
              <>
                <p className="rounded-lg bg-[var(--accent-strong)]/20 px-3 py-2 text-center text-sm font-medium text-[var(--foreground)]">
                  Refund done. The rice is back in stock.
                </p>
                <ReturnSlipPrint slip={slip} showOnScreen />
              </>
            ) : (
              <ReceiptPrint receipt={detail.receipt} showOnScreen={mode === "receipt"} />
            )}

            {mode === "receipt" && (
              <>
                {detail.returns.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                    <p className="mb-1 font-medium text-[var(--foreground)]">Refunds on this bill</p>
                    {detail.returns.map((r) => (
                      <div key={r.returnId} className="flex justify-between gap-2 text-[var(--muted)]">
                        <span>
                          {formatWhen(r.returnDate)} · {r.items.map((i) => `${formatNumber(i.qtyKg)}kg ${i.varietyName}`).join(", ")}
                        </span>
                        <span className="whitespace-nowrap text-[var(--foreground)]">Rs {formatNumber(r.refundAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detail.owner && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>Cost of the rice kept</span>
                      <span>Rs {formatNumber(detail.owner.cost)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-[var(--foreground)]">
                      <span>Profit (after discount and refunds)</span>
                      <span>Rs {formatNumber(detail.owner.profit)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "refund" && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="mb-1 font-semibold text-[var(--foreground)]">Refund Bill #{detail.receipt.billNumber}</h2>
                <p className="mb-3 text-xs text-[var(--muted)]">
                  Everything is filled in to return the whole bill. Lower a number to return only part. The rice goes back
                  into stock when you confirm.
                </p>
                <div className="flex flex-col gap-3">
                  {refundLines.map((l) => (
                    <div key={l.item.saleItemId}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-[var(--foreground)]">
                          {l.item.varietyName}
                          <span className="ml-1.5 rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs font-normal text-[var(--muted)]">
                            {packagingLabel(l.item.packaging)}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-[var(--foreground)]">Rs {formatNumber(l.amount)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          aria-label={`Kilos of ${l.item.varietyName} to return`}
                          value={qty[l.item.saleItemId] ?? ""}
                          onChange={(e) => setQty((p) => ({ ...p, [l.item.saleItemId]: e.target.value }))}
                          className="h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                        />
                        <span>
                          kg to return (of {formatNumber(l.left)} kg
                          {l.item.returnedKg > 0 ? `, ${formatNumber(l.item.returnedKg)} already returned` : ""})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason (optional)"
                  maxLength={200}
                  className="mt-3 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />

                <div className="mt-3 rounded-lg bg-[var(--surface-hover)] p-3 text-sm">
                  <div className="flex justify-between font-semibold text-[var(--foreground)]">
                    <span>Total refund</span>
                    <span>Rs {formatNumber(refundTotal)}</span>
                  </div>
                  {dueCancelled > 0 && (
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>Taken off what they still owe</span>
                      <span>Rs {formatNumber(dueCancelled)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-[var(--foreground)]">
                    <span>Give back in cash</span>
                    <span>Rs {formatNumber(cashBack)}</span>
                  </div>
                </div>

                {tooMuch && (
                  <p className="mt-2 text-xs text-[var(--danger-text)]">That is more than was sold on this bill.</p>
                )}
                {refundError && (
                  <p className="mt-2 rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]">
                    {refundError}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {mode === "receipt" && (
                <>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    Close
                  </button>
                  {refundableItems.length > 0 && (
                    <button
                      type="button"
                      onClick={startRefund}
                      className="h-11 flex-1 rounded-lg border border-[var(--danger-border)] bg-[var(--surface)] font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                    >
                      ↩ Refund
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-11 flex-1 rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110"
                  >
                    🖨 Print
                  </button>
                </>
              )}
              {mode === "refund" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("receipt")}
                    disabled={refunding}
                    className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmRefund}
                    disabled={refunding || refundTotal <= 0 || tooMuch}
                    className="h-11 flex-[2] rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110 disabled:opacity-50"
                  >
                    {refunding ? "Refunding..." : `Confirm refund · Rs ${formatNumber(refundTotal)}`}
                  </button>
                </>
              )}
              {mode === "slip" && (
                <>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-11 flex-1 rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110"
                  >
                    🖨 Print refund slip
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
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
