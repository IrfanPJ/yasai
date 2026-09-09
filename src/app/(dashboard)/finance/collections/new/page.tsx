import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FundCollectionForm } from "@/components/finance/fund-collection-form";

export default function NewFundCollectionPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Fund Collections
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">New Fund Collection</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record a customer payment — cash, bank transfer or cheque</p>
      </div>
      <FundCollectionForm />
    </div>
  );
}
