"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/purchases/new", label: "Purchase", icon: "📥" },
  { href: "/sales/new", label: "Sale", icon: "📤" },
  { href: "/stock", label: "Stock", icon: "📦" },
  { href: "/reports/daily", label: "Daily", icon: "🧾" },
  { href: "/reports/profit-loss", label: "P&L", icon: "📊" },
];

export default function NavBar({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Rice Shop</p>
          <p className="text-xs text-slate-500">{displayName}</p>
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
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div>
          <p className="text-sm font-semibold text-slate-900">Rice Shop</p>
          <p className="text-xs text-slate-500">{displayName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Log out
        </button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-emerald-700" : "text-slate-500"
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
