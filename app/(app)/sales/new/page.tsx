import SaleForm from "@/components/SaleForm";

export default function NewSalePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Record Sale</h1>
      <SaleForm />
    </div>
  );
}
