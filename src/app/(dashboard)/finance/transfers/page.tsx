import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronLeft, ArrowRightLeft, Clock, PackageCheck, CheckCircle2 } from "lucide-react";
import { FundTransferTable } from "@/components/finance/fund-transfer-table";

function fmtAmt(n: number) {
  return `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FundTransfersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fund_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const transfers = data ?? [];
  const aedOnly = transfers.filter(t => t.currency === "AED");

  const totalAed     = aedOnly.reduce((s, t) => s + Number(t.amount), 0);
  const inTransitAed = aedOnly.filter(t => t.status === "in_transit").reduce((s, t) => s + Number(t.amount), 0);
  const inTransitCnt = transfers.filter(t => t.status === "in_transit").length;
  const deliveredCnt = transfers.filter(t => t.status === "delivered").length;
  const confirmedCnt = transfers.filter(t => t.status === "confirmed").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Fund Transfers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">UAE → KSA transfers via bank or 3rd party cash</p>
        </div>
        <Link href="/finance/transfers/new">
          <Button size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Plus className="h-4 w-4" /> Initiate Transfer
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total (AED)</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-blue-700 dark:text-blue-400">{fmtAmt(totalAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{transfers.length} transfer{transfers.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <p className="text-xs text-muted-foreground">In Transit</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-yellow-700 dark:text-yellow-400">{fmtAmt(inTransitAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{inTransitCnt} active</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <PackageCheck className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <p className="text-base font-bold tabular-nums text-amber-700 dark:text-amber-400">{deliveredCnt}</p>
            <p className="text-xs text-muted-foreground mt-0.5">awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
            <p className="text-base font-bold tabular-nums text-green-700 dark:text-green-400">{confirmedCnt}</p>
            <p className="text-xs text-muted-foreground mt-0.5">completed</p>
          </CardContent>
        </Card>
      </div>

      <FundTransferTable transfers={transfers} />
    </div>
  );
}
