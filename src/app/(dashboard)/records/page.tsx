import { Header } from "@/components/layout/header";
import { CollectionsTable } from "@/components/collections/collection-table";
import { createClient } from "@/lib/supabase/server";
import type { GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Records" };

interface SearchParams {
  search?: string;
  cargo?: string;
  status?: string;
  from?: string;
  to?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function RecordsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("goods_collection_notes")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `collection_number.ilike.%${params.search}%,shipper_name.ilike.%${params.search}%,consignee_name.ilike.%${params.search}%,destination.ilike.%${params.search}%`
    );
  }
  if (params.cargo && params.cargo !== "all") {
    query = query.eq("cargo_type", params.cargo);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.from) {
    query = query.gte("created_at", params.from);
  }
  if (params.to) {
    query = query.lte("created_at", params.to);
  }

  const { data } = await query;

  return (
    <>
      <Header
        title="Records"
        subtitle="Complete archive of all goods collection notes"
      />
      <div className="flex-1 p-4 lg:p-6">
        <CollectionsTable
          data={(data || []) as GoodsCollectionNote[]}
          initialSearch={params.search}
          initialCargo={params.cargo}
          initialStatus={params.status}
        />
      </div>
    </>
  );
}
