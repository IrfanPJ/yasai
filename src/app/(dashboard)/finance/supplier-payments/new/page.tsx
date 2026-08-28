import { SupplierPaymentForm } from "@/components/finance/supplier-payment-form";

export default function NewSupplierPaymentPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">New Supplier Payment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record a payment to supplier via bank, CDM, or cash</p>
      </div>
      <SupplierPaymentForm />
    </div>
  );
}
