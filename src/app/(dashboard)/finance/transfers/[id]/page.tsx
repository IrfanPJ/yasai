import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { FundTransferDetail } from "@/components/finance/fund-transfer-detail";

interface Props { params: Promise<{ id: string }> }

export default async function FundTransferDetailPage({ params }: Props) {
  const { id } = await params;
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient.from("fund_transfers").select("*").eq("id", id).single();
  if (error || !data) notFound();

  const [{ data: linkedCollection }, { data: linkedPayments }] = await Promise.all([
    data.fund_collection_id
      ? serviceClient.from("fund_collections").select("id, collection_number, status, amount, currency, customer_name").eq("id", data.fund_collection_id).single()
      : Promise.resolve({ data: null }),
    serviceClient.from("supplier_payments").select("id, payment_number, status, amount, currency, supplier_name").eq("fund_transfer_id", id),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/transfers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Fund Transfers
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">{data.transfer_number}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data.source_region} → {data.destination_region}</p>
      </div>
      <FundTransferDetail transfer={data} linkedCollection={linkedCollection ?? undefined} linkedPayments={linkedPayments ?? []} />
    </div>
  );
}
