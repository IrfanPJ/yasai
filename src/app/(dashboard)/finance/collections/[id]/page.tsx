import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { FundCollectionDetail } from "@/components/finance/fund-collection-detail";

interface Props { params: Promise<{ id: string }> }

export default async function FundCollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const serviceClient = createServiceClient();

  const [{ data, error }, { data: linkedTransfers }] = await Promise.all([
    serviceClient.from("fund_collections").select("*").eq("id", id).single(),
    serviceClient.from("fund_transfers").select("id, transfer_number, status, amount, currency, source_region, destination_region").eq("fund_collection_id", id),
  ]);
  if (error || !data) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/finance/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Fund Collections
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">{data.collection_number}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data.customer_name}</p>
      </div>
      <FundCollectionDetail collection={data} linkedTransfers={linkedTransfers ?? []} />
    </div>
  );
}
