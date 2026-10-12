import { Noto_Nastaliq_Urdu } from "next/font/google";

// Urdu (Nastaliq) font for the shop name and city on receipts.
const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

// Override either one with NEXT_PUBLIC_SHOP_NAME / NEXT_PUBLIC_SHOP_ADDRESS in .env.
const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || "الشیخ ٹریڈرز";
const SHOP_ADDRESS = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "سیٹلائٹ ٹاؤن جھنگ";

export default function ShopHeader() {
  return (
    <div className="text-center" dir="rtl" lang="ur">
      <p className={`${urdu.className} text-xl font-bold leading-[1.9]`}>{SHOP_NAME}</p>
      <p className={`${urdu.className} text-sm leading-[1.9]`}>{SHOP_ADDRESS}</p>
    </div>
  );
}
