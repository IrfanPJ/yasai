import { Header } from "@/components/layout/header";
import { CollectionsTable } from "@/components/collections/collection-table";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collections" };

interface SearchParams {
  search?: string;
  cargo?: string;
  status?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function CollectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("goods_collection_notes")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `collection_number.ilike.%${params.search}%,shipper_name.ilike.%${params.search}%,consignee_name.ilike.%${params.search}%`
    );
  }

  if (params.cargo && params.cargo !== "all") {
    query = query.eq("cargo_type", params.cargo);
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data } = await query.limit(100);

  return (
    <>
      <Header
        title="Collections"
        subtitle="Manage all goods collection notes"
      />
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <Button asChild variant="secondary" size="sm" className="gap-2">
            <Link href="/collections/new">
              <PlusCircle className="h-4 w-4" />
              New Collection
            </Link>
          </Button>
        </div>
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
