import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FundCollectionTable } from "@/components/finance/fund-collection-table";

export default async function FundCollectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fund_collections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Fund Collections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customer payments collected — cash &amp; bank transfer</p>
        </div>
        <Link href="/finance/collections/new">
          <Button size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Plus className="h-4 w-4" /> New Collection
          </Button>
        </Link>
      </div>
      <FundCollectionTable collections={data ?? []} />
    </div>
  );
}
