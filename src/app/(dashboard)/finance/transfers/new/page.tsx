import { FundTransferForm } from "@/components/finance/fund-transfer-form";

export default function NewFundTransferPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Initiate Fund Transfer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Transfer funds from UAE to KSA via bank or 3rd party</p>
      </div>
      <FundTransferForm />
    </div>
  );
}
