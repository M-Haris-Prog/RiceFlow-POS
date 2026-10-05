"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const ALL_LINKS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/sales/new", label: "New Bill", icon: "🧾" },
  { href: "/bills", label: "Bills", icon: "🗂" },
  { href: "/purchases/new", label: "Purchase", icon: "📥" },
  { href: "/stock", label: "Stock", icon: "📦" },
  { href: "/reports/daily", label: "Daily", icon: "📅" },
  { href: "/reports/profit-loss", label: "P&L", icon: "📊" },
];

export default function NavBar({
  displayName,
  role,
}: {
  displayName: string;
  role: "OWNER" | "CASHIER";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const CASHIER_PAGES = ["/sales/new", "/bills"];
  const LINKS =
    role === "CASHIER" ? ALL_LINKS.filter((l) => CASHIER_PAGES.includes(l.href)) : ALL_LINKS;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">Rice Shop</p>
          <p className="text-xs text-[var(--muted)]">{displayName}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent-strong)]/15 text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-2 border-t border-[var(--border)] p-3">
          <ThemeToggle className="w-full" />
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Rice Shop</p>
          <p className="text-xs text-[var(--muted)]">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
