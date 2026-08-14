import { Header } from "@/components/layout/header";
import { WaybillDetail } from "@/components/waybills/waybill-detail";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Waybill } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function WaybillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("waybills")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) notFound();

  return (
    <>
      <Header
        title={`Waybill ${data.waybill_number}`}
        subtitle={`${data.shipper_name} → ${data.port_of_discharge}`}
      />
      <div className="flex-1 p-4 lg:p-6">
        <WaybillDetail waybill={data as Waybill} />
      </div>
    </>
  );
}
