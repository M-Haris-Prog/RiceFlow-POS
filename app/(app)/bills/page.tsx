"use client";

import { useEffect, useState } from "react";
import { formatNumber, paymentLabel, todayInputValue } from "@/lib/format";
import type { ReceiptData } from "@/lib/receipt";
import ReceiptPrint from "@/components/ReceiptPrint";

interface BillRow {
  id: string;
  billNumber: number;
  billDate: string;
  customerName: string | null;
  cashierName: string;
  itemCount: number;
  total: number;
  paymentMethod: string;
  amountDue: number;
  profit?: number;
}

interface HistoryResponse {
  role: "OWNER" | "CASHIER";
  truncated: boolean;
  totals: { count: number; sales: number; due: number; profit?: number };
  bills: BillRow[];
}

interface Detail {
  receipt: ReceiptData;
  owner?: { cost: number; profit: number };
}

function daysAgoInputValue(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function BillHistoryPage() {
  const [from, setFrom] = useState(daysAgoInputValue(6));
  const [to, setTo] = useState(todayInputValue());
  const [q, setQ] = useState("");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for a fetch triggered by the filters changing
    setLoading(true);
    const params = new URLSearchParams({ from, to, q });
    fetch(`/api/bills/history?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [from, to, q]);

  async function openBill(id: string) {
    setDetailError(null);
    const res = await fetch(`/api/bills/${id}`);
    const body = await res.json();
    if (!res.ok) {
      setDetailError(body.error ?? "Could not open this bill");
      return;
    }
    setDetail(body);
  }

  const isOwner = data?.role === "OWNER";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Bill history</h1>
        <p className="text-sm text-[var(--muted)]">
          {data && !isOwner
            ? "Today's bills. Tap one to see it or print it again."
            : "Every bill made. Tap one to see it or print it again."}
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
          <Metric value={`Rs ${formatNumber(data.totals.sales)}`} label="total sales" />
          <Metric value={`Rs ${formatNumber(data.totals.due)}`} label="still due" />
          {isOwner && data.totals.profit !== undefined && (
            <Metric value={`Rs ${formatNumber(data.totals.profit)}`} label="profit (after discounts)" />
          )}
        </div>
      )}

      {detailError && (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{detailError}</p>
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
                    <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                      #{b.billNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--foreground)]">
                      {new Date(b.billDate).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-[var(--foreground)]">{b.customerName ?? "—"}</td>
                    <td className="px-4 py-2 text-[var(--foreground)]">{b.itemCount}</td>
                    <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                      Rs {formatNumber(b.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--foreground)]">
                      {paymentLabel(b.paymentMethod)}
                      {b.amountDue > 0 && (
                        <span className="ml-2 rounded bg-amber-950 px-1.5 py-0.5 text-xs text-amber-300">
                          Due {formatNumber(b.amountDue)}
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-2 text-[var(--foreground)]">
                        {formatNumber(b.profit ?? 0)}
                      </td>
                    )}
                    {isOwner && (
                      <td className="px-4 py-2 text-[var(--muted)]">{b.cashierName}</td>
                    )}
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
            <ReceiptPrint receipt={detail.receipt} showOnScreen />

            {detail.owner && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Cost of the rice</span>
                  <span>Rs {formatNumber(detail.owner.cost)}</span>
                </div>
                <div className="flex justify-between font-medium text-[var(--foreground)]">
                  <span>Profit (after discount)</span>
                  <span>Rs {formatNumber(detail.owner.profit)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 flex-1 rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110"
              >
                🖨 Print
              </button>
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
