import PurchaseForm from "@/components/PurchaseForm";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ variety?: string; packaging?: string }>;
}) {
  const { variety, packaging } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Record Purchase</h1>
      <PurchaseForm initialVariety={variety ?? ""} initialPackaging={packaging ?? ""} />
    </div>
  );
}
