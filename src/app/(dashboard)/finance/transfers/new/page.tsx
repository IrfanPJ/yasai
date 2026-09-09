import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FundTransferForm } from "@/components/finance/fund-transfer-form";

export default function NewFundTransferPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/transfers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Fund Transfers
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Initiate Fund Transfer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Transfer funds from UAE to KSA via bank or 3rd party</p>
      </div>
      <FundTransferForm />
    </div>
  );
}
