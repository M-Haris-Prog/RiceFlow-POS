"use client";

export const THEME_KEY = "rice-shop:theme";
type Theme = "dark" | "light";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "White", icon: "☀️" },
  { value: "dark", label: "Black", icon: "🌙" },
];

// Remembers the choice on this device. The layout applies it before the page paints (no flash),
// and globals.css highlights the active button from the page's own data-theme, so there is no
// React state to fall out of step with it.
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function choose(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The choice just won't be remembered after closing the page.
    }
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`inline-flex overflow-hidden rounded-lg border border-[var(--border)] ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          data-value={o.value}
          onClick={() => choose(o.value)}
          title={`${o.label} theme`}
          className="theme-option flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <span aria-hidden>{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
