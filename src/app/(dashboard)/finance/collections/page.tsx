import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronLeft, Banknote, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { FundCollectionTable } from "@/components/finance/fund-collection-table";

function fmtAmt(n: number) {
  return `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FundCollectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fund_collections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const collections = data ?? [];
  const aedOnly = collections.filter(c => c.currency === "AED");

  const totalAed    = aedOnly.reduce((s, c) => s + Number(c.amount), 0);
  const pendingAed  = aedOnly.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const pendingCnt  = collections.filter(c => c.status === "pending").length;
  const approvedCnt = collections.filter(c => c.status === "approved").length;
  const verifiedCnt = collections.filter(c => c.status === "verified").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Fund Collections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customer payments collected — cash, bank transfer &amp; cheque</p>
        </div>
        <Link href="/finance/collections/new">
          <Button size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Plus className="h-4 w-4" /> New Collection
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total (AED)</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{fmtAmt(totalAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-yellow-700 dark:text-yellow-400">{fmtAmt(pendingAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pendingCnt} collection{pendingCnt !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">{approvedCnt}</p>
            <p className="text-xs text-muted-foreground mt-0.5">awaiting verification</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <p className="text-base font-bold tabular-nums text-green-700 dark:text-green-400">{verifiedCnt}</p>
            <p className="text-xs text-muted-foreground mt-0.5">fully processed</p>
          </CardContent>
        </Card>
      </div>

      <FundCollectionTable collections={collections} />
    </div>
  );
}
