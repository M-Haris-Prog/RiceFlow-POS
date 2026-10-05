"use client";

import { createPortal } from "react-dom";
import type { ReturnSlipData } from "@/lib/receipt";
import { formatNumber } from "@/lib/format";
import { packagingLabel } from "@/lib/packaging";
import ShopHeader from "@/components/ShopHeader";

function SlipBody({ slip }: { slip: ReturnSlipData }) {
  const date = new Date(slip.returnDate);
  return (
    <div className="text-[13px] leading-snug text-black">
      <ShopHeader />
      <div className="my-2 border-t border-dashed border-neutral-500" />
      <p className="text-center text-base font-bold">REFUND</p>
      <div className="mt-1 flex justify-between text-xs">
        <span>For Bill #{slip.billNumber}</span>
        <span>
          {date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}{" "}
          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {slip.customerName && <p className="mt-1 text-xs">Customer: {slip.customerName}</p>}
      <div className="my-2 border-t border-dashed border-neutral-500" />

      <div className="flex flex-col gap-1.5">
        {slip.items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between gap-2 font-medium">
              <span>
                {item.varietyName} ({packagingLabel(item.packaging)})
              </span>
              <span>{formatNumber(item.refundAmount)}</span>
            </div>
            <p className="text-xs">{formatNumber(item.qtyKg)} kg returned</p>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-neutral-500" />
      <div className="flex justify-between text-base font-bold">
        <span>REFUND</span>
        <span>Rs {formatNumber(slip.refundAmount)}</span>
      </div>
      {slip.dueReduced > 0 && (
        <div className="flex justify-between text-xs">
          <span>Taken off balance owed</span>
          <span>Rs {formatNumber(slip.dueReduced)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs font-bold">
        <span>Cash given back</span>
        <span>Rs {formatNumber(slip.cashRefunded)}</span>
      </div>
      {slip.note && <p className="mt-1 text-xs">Note: {slip.note}</p>}

      <div className="my-2 border-t border-dashed border-neutral-500" />
      <p className="text-center text-xs">Handled by {slip.cashierName}</p>
    </div>
  );
}

// Shows the refund slip on screen (optional) and keeps a copy ready to print, like the receipt.
export default function ReturnSlipPrint({
  slip,
  showOnScreen = false,
}: {
  slip: ReturnSlipData;
  showOnScreen?: boolean;
}) {
  return (
    <>
      {showOnScreen && (
        <div className="receipt-paper mx-auto w-full max-w-[320px] rounded-sm p-5 pb-7">
          <SlipBody slip={slip} />
        </div>
      )}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="print-portal">
            <SlipBody slip={slip} />
          </div>,
          document.body
        )}
    </>
  );
}
