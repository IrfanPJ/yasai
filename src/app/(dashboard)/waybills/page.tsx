import { Header } from "@/components/layout/header";
import { WaybillTable } from "@/components/waybills/waybill-table";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { Waybill } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waybills" };

export default async function WaybillsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("waybills")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <Header title="Waybills" subtitle="Manage shipment waybills" />
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <Button asChild size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Link href="/waybills/new">
              <PlusCircle className="h-4 w-4" />
              New Waybill
            </Link>
          </Button>
        </div>
        <WaybillTable data={(data || []) as Waybill[]} />
      </div>
    </>
  );
}
