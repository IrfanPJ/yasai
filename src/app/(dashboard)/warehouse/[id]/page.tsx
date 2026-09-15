import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CollectionsTable } from "@/components/collections/collection-table";
import { createClient } from "@/lib/supabase/server";
import type { GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WarehouseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: warehouse } = await supabase.from("warehouses").select("*").eq("id", id).single();
  if (!warehouse) notFound();

  const { data } = await supabase
    .from("goods_collection_notes")
    .select("*")
    .eq("warehouse_id", id)
    .eq("status", "in_warehouse")
    .is("deleted_at", null)
    .order("warehouse_received_at", { ascending: false });

  return (
    <>
      <Header
        title={`${warehouse.code} — ${warehouse.name}`}
        subtitle={`${warehouse.country} · What's currently stored here`}
      />
      <div className="flex-1 p-4 lg:p-6">
        <CollectionsTable data={(data || []) as GoodsCollectionNote[]} />
      </div>
    </>
  );
}
