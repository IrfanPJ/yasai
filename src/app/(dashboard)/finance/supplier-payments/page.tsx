import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronLeft, CreditCard, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { SupplierPaymentTable } from "@/components/finance/supplier-payment-table";

function fmtAmt(n: number) {
  return `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SupplierPaymentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("supplier_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const payments = data ?? [];
  const aedOnly  = payments.filter(p => p.currency === "AED");

  const totalAed   = aedOnly.reduce((s, p) => s + Number(p.amount), 0);
  const pendingAed = aedOnly.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const pendingCnt  = payments.filter(p => p.status === "pending").length;
  const paidCnt     = payments.filter(p => p.status === "paid").length;
  const confirmedCnt = payments.filter(p => p.status === "confirmed").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Supplier Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bank transfer, CDM deposit, and cash-to-hand payments</p>
        </div>
        <Link href="/finance/supplier-payments/new">
          <Button size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Plus className="h-4 w-4" /> New Payment
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total (AED)</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-violet-700 dark:text-violet-400">{fmtAmt(totalAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{payments.length} payment{payments.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <p className="text-base font-bold font-mono tabular-nums text-yellow-700 dark:text-yellow-400">{fmtAmt(pendingAed)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pendingCnt} awaiting</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
            <p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">{paidCnt}</p>
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

      <SupplierPaymentTable payments={payments} />
    </div>
  );
}
