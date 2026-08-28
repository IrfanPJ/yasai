import { FundCollectionForm } from "@/components/finance/fund-collection-form";

export default function NewFundCollectionPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">New Fund Collection</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record a customer payment — cash or bank transfer</p>
      </div>
      <FundCollectionForm />
    </div>
  );
}
