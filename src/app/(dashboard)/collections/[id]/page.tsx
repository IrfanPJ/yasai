import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CollectionDetail } from "@/components/collections/collection-detail";
import type { GoodsCollectionNote, DeliveryNote } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data, error } = await supabase
    .from("goods_collection_notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: deliveryNote }] = await Promise.all([
    user
      ? serviceClient.from("user_profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    serviceClient
      .from("delivery_notes")
      .select("*")
      .eq("collection_id", id)
      .maybeSingle(),
  ]);

  return (
    <>
      <Header
        title={data.collection_number}
        subtitle="Goods Collection Note Details"
      />
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <CollectionDetail
            collection={data as GoodsCollectionNote}
            userRole={profile?.role || "viewer"}
            deliveryNote={(deliveryNote as DeliveryNote | null) ?? null}
          />
        </div>
      </div>
    </>
  );
}
