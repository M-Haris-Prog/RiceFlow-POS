import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rice Shop Inventory",
  description: "Stock, purchases, sales and profit tracking for the shop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
