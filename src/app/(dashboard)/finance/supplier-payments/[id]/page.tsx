import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { SupplierPaymentDetail } from "@/components/finance/supplier-payment-detail";

interface Props { params: Promise<{ id: string }> }

export default async function SupplierPaymentDetailPage({ params }: Props) {
  const { id } = await params;
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient.from("supplier_payments").select("*").eq("id", id).single();
  if (error || !data) notFound();

  const linkedTransfer = data.fund_transfer_id
    ? (await serviceClient.from("fund_transfers").select("id, transfer_number, status, amount, currency, source_region, destination_region").eq("id", data.fund_transfer_id).single()).data
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/supplier-payments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Supplier Payments
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">{data.payment_number}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data.supplier_name}</p>
      </div>
      <SupplierPaymentDetail payment={data} linkedTransfer={linkedTransfer ?? undefined} />
    </div>
  );
}
