import PurchaseForm from "@/components/PurchaseForm";

export default function NewPurchasePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Record Purchase</h1>
      <PurchaseForm />
    </div>
  );
}
