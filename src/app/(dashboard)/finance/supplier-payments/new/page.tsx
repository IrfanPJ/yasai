import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SupplierPaymentForm } from "@/components/finance/supplier-payment-form";

export default function NewSupplierPaymentPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/supplier-payments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Supplier Payments
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">New Supplier Payment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Record a payment to supplier via bank, CDM, or cash</p>
      </div>
      <SupplierPaymentForm />
    </div>
  );
}
