import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowRightLeft, CreditCard, FileText, TrendingUp, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

function fmtAmt(n: number) {
  return `AED ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

export default async function FinancePage() {
  const supabase = await createClient();

  const [
    collectionsRes,
    transfersRes,
    paymentsRes,
    docsRes,
    recentCollections,
    recentTransfers,
    recentPayments,
  ] = await Promise.all([
    supabase.from("fund_collections").select("id, status, amount, currency, collection_number, customer_name, collection_date"),
    supabase.from("fund_transfers").select("id, status, amount, currency, transfer_number, source_region, destination_region, created_at"),
    supabase.from("supplier_payments").select("id, status, amount, currency, payment_number, supplier_name, payment_date"),
    supabase.from("backup_documents").select("id, doc_number, doc_type, supplier_name, amount, created_at"),
    supabase.from("fund_collections").select("id, collection_number, customer_name, amount, currency, status, collection_date").order("created_at", { ascending: false }).limit(5),
    supabase.from("fund_transfers").select("id, transfer_number, amount, currency, status, source_region, destination_region, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("supplier_payments").select("id, payment_number, supplier_name, amount, currency, status, payment_date").order("created_at", { ascending: false }).limit(5),
  ]);

  const collections = collectionsRes.data ?? [];
  const transfers = transfersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const docs = docsRes.data ?? [];

  const totalCollected = collections.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const totalTransferred = transfers.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = payments.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const netBalance = totalCollected - totalTransferred;

  const pendingCollections = collections.filter(r => r.status === "pending").length;
  const pendingCollectionAmt = collections.filter(r => r.status === "pending" && r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const inTransitTransfers = transfers.filter(r => r.status === "in_transit").length;
  const inTransitAmt = transfers.filter(r => r.status === "in_transit" && r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const pendingPayments = payments.filter(r => r.status === "pending").length;
  const pendingPaymentAmt = payments.filter(r => r.status === "pending" && r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);

  const COLLECTION_STATUS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  const TRANSFER_STATUS: Record<string, string> = {
    initiated: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    delivered: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  const PAYMENT_STATUS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fund flow overview — collections, transfers, supplier payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/finance/collections/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#071A3A] text-white hover:bg-[#0d2a5e] transition-colors">
            <Banknote className="h-3.5 w-3.5" /> New Collection
          </Link>
          <Link href="/finance/transfers/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors">
            <ArrowRightLeft className="h-3.5 w-3.5" /> New Transfer
          </Link>
          <Link href="/finance/supplier-payments/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors">
            <CreditCard className="h-3.5 w-3.5" /> New Payment
          </Link>
        </div>
      </div>

      {/* Cashflow totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total Collected</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{fmtAmt(totalCollected)}</p>
            <p className="text-xs text-muted-foreground mt-1">{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total Transferred</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-blue-700 dark:text-blue-400">{fmtAmt(totalTransferred)}</p>
            <p className="text-xs text-muted-foreground mt-1">{transfers.length} transfer{transfers.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-violet-600" />
              </div>
              <p className="text-xs text-muted-foreground">Total Paid Out</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-violet-700 dark:text-violet-400">{fmtAmt(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-1">{payments.length} payment{payments.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-red-50 dark:bg-red-950"}`}>
                <Banknote className={`h-4 w-4 ${netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`} />
              </div>
              <p className="text-xs text-muted-foreground">Net Balance</p>
            </div>
            <p className={`text-lg font-bold font-mono tabular-nums ${netBalance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{fmtAmt(netBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">collected − transferred</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending alerts */}
      {(pendingCollections > 0 || inTransitTransfers > 0 || pendingPayments > 0) && (
        <Card className="border-none shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" /> Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {pendingCollections > 0 && (
              <Link href="/finance/collections" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200">{pendingCollections} collection{pendingCollections !== 1 ? "s" : ""} awaiting approval</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-mono mt-0.5">{fmtAmt(pendingCollectionAmt)}</p>
                  </div>
                  <Clock className="h-4 w-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                </div>
              </Link>
            )}
            {inTransitTransfers > 0 && (
              <Link href="/finance/transfers" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-200">{inTransitTransfers} transfer{inTransitTransfers !== 1 ? "s" : ""} in transit</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-mono mt-0.5">{fmtAmt(inTransitAmt)}</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-blue-500 group-hover:text-blue-700 transition-colors" />
                </div>
              </Link>
            )}
            {pendingPayments > 0 && (
              <Link href="/finance/supplier-payments" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-violet-900 dark:text-violet-200">{pendingPayments} payment{pendingPayments !== 1 ? "s" : ""} pending</p>
                    <p className="text-xs text-violet-700 dark:text-violet-400 font-mono mt-0.5">{fmtAmt(pendingPaymentAmt)}</p>
                  </div>
                  <CreditCard className="h-4 w-4 text-violet-500 group-hover:text-violet-700 transition-colors" />
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Module nav + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Collections */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-[#071A3A] dark:text-white">
                <Banknote className="h-4 w-4 text-emerald-600" /> Collections
              </CardTitle>
              <Link href="/finance/collections" className="text-xs text-[#E67A32] hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {(recentCollections.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No collections yet</p>
            ) : (recentCollections.data ?? []).map(c => (
              <Link key={c.id} href={`/finance/collections/${c.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{c.collection_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.customer_name}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-mono tabular-nums">{c.currency} {Number(c.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${COLLECTION_STATUS[c.status]}`}>{c.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transfers */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-[#071A3A] dark:text-white">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" /> Transfers
              </CardTitle>
              <Link href="/finance/transfers" className="text-xs text-[#E67A32] hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {(recentTransfers.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No transfers yet</p>
            ) : (recentTransfers.data ?? []).map(t => (
              <Link key={t.id} href={`/finance/transfers/${t.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{t.transfer_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.source_region} → {t.destination_region}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-mono tabular-nums">{t.currency} {Number(t.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${TRANSFER_STATUS[t.status]}`}>{t.status.replace("_", " ")}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-[#071A3A] dark:text-white">
                <CreditCard className="h-4 w-4 text-violet-600" /> Supplier Payments
              </CardTitle>
              <Link href="/finance/supplier-payments" className="text-xs text-[#E67A32] hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {(recentPayments.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
            ) : (recentPayments.data ?? []).map(p => (
              <Link key={p.id} href={`/finance/supplier-payments/${p.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{p.payment_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.supplier_name}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-mono tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${PAYMENT_STATUS[p.status]}`}>{p.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Backup docs quick link */}
      <Link href="/finance/backup-docs">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Backup Documents</p>
              <p className="text-xs text-muted-foreground">Proforma Invoices &amp; Purchase Orders — {docs.length} document{docs.length !== 1 ? "s" : ""}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
