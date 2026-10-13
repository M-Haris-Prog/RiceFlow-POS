"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatNumber, todayInputValue } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";

interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  day: string;
  createdBy: string;
}

interface ExpenseList {
  expenses: ExpenseRow[];
  total: number;
  byCategory: { category: string; total: number; count: number }[];
  knownCategories: string[];
}

function firstOfMonthInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// "2026-10-13" -> "13 Oct 2026" (worked out from the text so no timezone can shift the day)
function prettyDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const inputClass =
  "h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30";

export default function ExpensesPage() {
  const [from, setFrom] = useState(firstOfMonthInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [list, setList] = useState<ExpenseList | null>(null);
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?from=${from}&to=${to}`);
      const data = await res.json();
      if (res.ok) setList(data);
    } catch {
      // keep whatever is on screen
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch triggered by the date range changing
    load();
  }, [load]);

  // Built-in categories first, then any custom ones used before.
  const quickPicks = [
    ...EXPENSE_CATEGORIES,
    ...(list?.knownCategories ?? []).filter(
      (c) => !EXPENSE_CATEGORIES.some((b) => b.toLowerCase() === c.toLowerCase())
    ),
  ];
  const isQuickPick = quickPicks.some((c) => c.toLowerCase() === category.trim().toLowerCase());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!category.trim()) {
      setError("Choose what the expense is for, or write your own.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount: Number(amount), expenseDate: date, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the expense");
        return;
      }
      setSuccess(`Saved: Rs ${formatNumber(Number(amount))} for ${category.trim()}.`);
      setAmount("");
      setNote("");
      // Make sure the new entry is inside the range being shown.
      if (date < from) setFrom(date);
      else if (date > to) setTo(date);
      else await load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the expense");
        return;
      }
      setConfirmId(null);
      await load();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Expenses</h1>

      <form
        onSubmit={handleSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Add an expense</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
            What is it for?
          </label>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((c) => {
              const active = category.trim().toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={active}
                  className={`h-10 rounded-full border px-4 text-sm font-medium ${
                    active
                      ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-black"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={isQuickPick ? "" : category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={40}
            placeholder="Or write something else, e.g. Tea, Phone bill"
            className={`${inputClass} mt-2`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
              Amount (Rs)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--muted)]">
            Note <span className="text-[var(--muted)]">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="e.g. Diesel for the delivery van"
            className={inputClass}
          />
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
          disabled={saving}
          className="h-12 w-full rounded-lg bg-[var(--accent-strong)] font-medium text-black hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Expense"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Expense record</h2>

        <div className="grid max-w-md grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--muted)]">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {loading && !list && <p className="text-sm text-[var(--muted)]">Loading...</p>}

        {list && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs font-medium text-[var(--muted)]">Total spent</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  Rs {formatNumber(list.total)}
                </p>
              </div>
              {list.byCategory.map((c) => (
                <div
                  key={c.category}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {c.category} ({c.count})
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Rs {formatNumber(c.total)}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {list.expenses.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--muted)]">
                  No expenses recorded in this date range.
                </p>
              ) : (
                <ul>
                  {list.expenses.map((x) => (
                    <li
                      key={x.id}
                      className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--foreground)]">{x.category}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {prettyDay(x.day)}
                          {x.note ? ` · ${x.note}` : ""} · {x.createdBy}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="font-semibold text-[var(--foreground)]">
                          Rs {formatNumber(x.amount)}
                        </p>
                        {confirmId === x.id ? (
                          <span className="flex items-center gap-1 text-sm">
                            <button
                              onClick={() => handleDelete(x.id)}
                              className="rounded-lg bg-[var(--danger-bg)] px-3 py-1.5 font-medium text-[var(--danger-text)]"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(x.id)}
                            aria-label={`Delete ${x.category} expense of ${x.amount}`}
                            className="rounded-lg px-2 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
