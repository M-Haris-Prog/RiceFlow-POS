import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rice Shop Inventory",
  description: "Stock, purchases, sales and profit tracking for the shop",
};

// Runs before the page paints so a saved "White" choice never flashes dark first.
const APPLY_THEME = `try{document.documentElement.dataset.theme=localStorage.getItem('rice-shop:theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
