"use client";

import { createPortal } from "react-dom";
import type { ReceiptData } from "@/lib/receipt";
import { formatNumber, paymentLabel } from "@/lib/format";
import ShopHeader from "@/components/ShopHeader";


function ReceiptBody({ receipt }: { receipt: ReceiptData }) {
  const date = new Date(receipt.billDate);
  const change = receipt.amountReceived - receipt.total;

  return (
    <div className="text-[13px] leading-snug text-black">
      <ShopHeader />
      <div className="my-2 border-t border-dashed border-neutral-500" />
      <div className="flex justify-between text-xs">
        <span>Bill #{receipt.billNumber}</span>
        <span>
          {date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}{" "}
          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {(receipt.customerName || receipt.customerPhone) && (
        <p className="mt-1 text-xs">
          Customer: {[receipt.customerName, receipt.customerPhone].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="my-2 border-t border-dashed border-neutral-500" />

      <div className="flex flex-col gap-1.5">
        {receipt.items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between gap-2 font-medium">
              <span>{item.varietyName}</span>
              <span>{formatNumber(item.lineTotal)}</span>
            </div>
            <p className="text-xs">
              {formatNumber(item.qtyKg)} kg × {formatNumber(item.ratePerKg)}
            </p>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-neutral-500" />
      <div className="flex justify-between text-xs">
        <span>Subtotal</span>
        <span>Rs {formatNumber(receipt.subtotal)}</span>
      </div>
      {receipt.discountAmount > 0 && (
        <div className="flex justify-between text-xs">
          <span>Discount</span>
          <span>- Rs {formatNumber(receipt.discountAmount)}</span>
        </div>
      )}
      <div className="my-1.5 border-t border-dashed border-neutral-500" />
      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>Rs {formatNumber(receipt.total)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Paid ({paymentLabel(receipt.paymentMethod)})</span>
        <span>Rs {formatNumber(receipt.amountReceived)}</span>
      </div>
      {receipt.amountDue > 0 && (
        <div className="flex justify-between text-xs font-bold">
          <span>Balance due</span>
          <span>Rs {formatNumber(receipt.amountDue)}</span>
        </div>
      )}
      {change > 0 && (
        <div className="flex justify-between text-xs">
          <span>Change</span>
          <span>Rs {formatNumber(change)}</span>
        </div>
      )}

      <div className="my-2 border-t border-dashed border-neutral-500" />
      <p className="text-center text-xs">Served by {receipt.cashierName}</p>
      <p className="mt-1 text-center text-xs">Thank you! Please come again.</p>
    </div>
  );
}

// Shows the receipt on screen (optional) and always keeps a copy ready for printing.
// The print copy is attached straight to <body>; globals.css hides everything else when printing.
export default function ReceiptPrint({
  receipt,
  showOnScreen = false,
}: {
  receipt: ReceiptData;
  showOnScreen?: boolean;
}) {
  return (
    <>
      {showOnScreen && (
        <div className="receipt-paper mx-auto w-full max-w-[320px] rounded-sm p-5 pb-7">
          <ReceiptBody receipt={receipt} />
        </div>
      )}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="print-portal">
            <ReceiptBody receipt={receipt} />
          </div>,
          document.body
        )}
    </>
  );
}
