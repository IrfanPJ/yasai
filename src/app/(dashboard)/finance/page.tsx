import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Banknote, ArrowRightLeft, CreditCard, FileText,
  TrendingUp, Clock, AlertCircle, CheckCircle2,
  ShieldCheck, PackageCheck, ArrowRight,
} from "lucide-react";
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
    supabase.from("fund_collections").select("id, status, amount, currency, collection_number, customer_name, collection_date, payment_mode"),
    supabase.from("fund_transfers").select("id, status, amount, currency, transfer_number, source_region, destination_region, created_at"),
    supabase.from("supplier_payments").select("id, status, amount, currency, payment_number, supplier_name, payment_date"),
    supabase.from("backup_documents").select("id, doc_number, doc_type, supplier_name, amount, currency, created_at"),
    supabase.from("fund_collections").select("id, collection_number, customer_name, amount, currency, status, collection_date, payment_mode").order("created_at", { ascending: false }).limit(6),
    supabase.from("fund_transfers").select("id, transfer_number, amount, currency, status, source_region, destination_region, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("supplier_payments").select("id, payment_number, supplier_name, amount, currency, status, payment_date").order("created_at", { ascending: false }).limit(6),
  ]);

  const collections = collectionsRes.data ?? [];
  const transfers   = transfersRes.data ?? [];
  const payments    = paymentsRes.data ?? [];
  const docs        = docsRes.data ?? [];

  // ── Cashflow totals (AED only for net calc) ──
  const totalCollected  = collections.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const totalTransferred = transfers.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid       = payments.filter(r => r.currency === "AED").reduce((s, r) => s + Number(r.amount), 0);
  const netBalance      = totalCollected - totalTransferred;

  // ── Multi-currency collections breakdown ──
  const foreignCurrencies: Record<string, number> = {};
  for (const c of collections) {
    if (c.currency !== "AED") {
      foreignCurrencies[c.currency] = (foreignCurrencies[c.currency] ?? 0) + Number(c.amount);
    }
  }

  // ── Collection status counts ──
  const col_pending  = collections.filter(c => c.status === "pending").length;
  const col_approved = collections.filter(c => c.status === "approved").length;
  const col_verified = collections.filter(c => c.status === "verified").length;
  const col_pending_amt = collections.filter(c => c.status === "pending" && c.currency === "AED").reduce((s, c) => s + Number(c.amount), 0);

  // ── Transfer status counts ──
  const tr_initiated = transfers.filter(t => t.status === "initiated").length;
  const tr_transit   = transfers.filter(t => t.status === "in_transit").length;
  const tr_delivered = transfers.filter(t => t.status === "delivered").length;
  const tr_confirmed = transfers.filter(t => t.status === "confirmed").length;
  const tr_transit_amt = transfers.filter(t => t.status === "in_transit" && t.currency === "AED").reduce((s, t) => s + Number(t.amount), 0);

  // ── Payment status counts ──
  const pay_pending   = payments.filter(p => p.status === "pending").length;
  const pay_paid      = payments.filter(p => p.status === "paid").length;
  const pay_confirmed = payments.filter(p => p.status === "confirmed").length;
  const pay_pending_amt = payments.filter(p => p.status === "pending" && p.currency === "AED").reduce((s, p) => s + Number(p.amount), 0);

  const hasPendingActions = col_pending > 0 || tr_transit > 0 || pay_pending > 0 || tr_delivered > 0;

  const COLLECTION_STATUS: Record<string, string> = {
    pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  const TRANSFER_STATUS: Record<string, string> = {
    initiated:  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    delivered:  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    confirmed:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  const PAYMENT_STATUS: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    paid:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  const MODE_LABEL: Record<string, string> = { cash: "Cash", bank_transfer: "Bank", cheque: "Cheque" };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fund collections, transfers, supplier payments &amp; backup documents</p>
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
          <Link href="/finance/backup-docs/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors">
            <FileText className="h-3.5 w-3.5" /> New Doc
          </Link>
        </div>
      </div>

      {/* ── Cashflow summary ─────────────────────────────────── */}
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
            {Object.entries(foreignCurrencies).length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                {Object.entries(foreignCurrencies).map(([cur, amt]) => `+ ${cur} ${amt.toLocaleString()}`).join(" · ")}
              </p>
            )}
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

      {/* ── Module status grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Collections status */}
        <Link href="/finance/collections">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-[#071A3A] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-600" /> Collections</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> Pending</span>
                <span className="font-semibold text-yellow-700 dark:text-yellow-400">{col_pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-blue-500" /> Approved</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{col_approved}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Verified</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{col_verified}</span>
              </div>
              <Separator className="my-1" />
              <p className="text-[10px] text-muted-foreground font-mono">Pending: {fmtAmt(col_pending_amt)}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Transfers status */}
        <Link href="/finance/transfers">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-[#071A3A] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" /> Transfers</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Initiated</span>
                <span className="font-semibold">{tr_initiated}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-blue-500" /> In Transit</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{tr_transit}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><PackageCheck className="h-3 w-3 text-amber-500" /> Delivered</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">{tr_delivered}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Confirmed</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{tr_confirmed}</span>
              </div>
              <Separator className="my-1" />
              <p className="text-[10px] text-muted-foreground font-mono">In Transit: {fmtAmt(tr_transit_amt)}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Supplier Payments status */}
        <Link href="/finance/supplier-payments">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-[#071A3A] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-violet-600" /> Supplier Payments</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> Pending</span>
                <span className="font-semibold text-yellow-700 dark:text-yellow-400">{pay_pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-blue-500" /> Paid</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{pay_paid}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Confirmed</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{pay_confirmed}</span>
              </div>
              <Separator className="my-1" />
              <p className="text-[10px] text-muted-foreground font-mono">Pending: {fmtAmt(pay_pending_amt)}</p>
            </CardContent>
          </Card>
        </Link>

        {/* Backup Docs */}
        <Link href="/finance/backup-docs">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-[#071A3A] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-orange-600" /> Backup Docs</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">PI (Proforma Invoice)</span>
                <span className="font-semibold">{docs.filter(d => d.doc_type === "pi").length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">PO (Purchase Order)</span>
                <span className="font-semibold">{docs.filter(d => d.doc_type === "po").length}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Total Documents</span>
                <span className="font-bold text-[#E67A32]">{docs.length}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Pending Actions ──────────────────────────────────── */}
      <Card className={`border-none shadow-sm ${hasPendingActions ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-green-400"}`}>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className={`text-sm flex items-center gap-2 ${hasPendingActions ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
            {hasPendingActions
              ? <><AlertCircle className="h-4 w-4" /> Pending Actions</>
              : <><CheckCircle2 className="h-4 w-4" /> All Clear — No Pending Actions</>
            }
          </CardTitle>
        </CardHeader>
        {hasPendingActions && (
          <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {col_pending > 0 && (
              <Link href="/finance/collections" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 hover:bg-yellow-100 dark:hover:bg-yellow-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-yellow-900 dark:text-yellow-200">{col_pending} collection{col_pending !== 1 ? "s" : ""} awaiting approval</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 font-mono mt-0.5">{fmtAmt(col_pending_amt)}</p>
                  </div>
                  <Banknote className="h-4 w-4 text-yellow-500 shrink-0 ml-2" />
                </div>
              </Link>
            )}
            {tr_transit > 0 && (
              <Link href="/finance/transfers" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-200">{tr_transit} transfer{tr_transit !== 1 ? "s" : ""} in transit</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-mono mt-0.5">{fmtAmt(tr_transit_amt)}</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-blue-500 shrink-0 ml-2" />
                </div>
              </Link>
            )}
            {tr_delivered > 0 && (
              <Link href="/finance/transfers" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200">{tr_delivered} transfer{tr_delivered !== 1 ? "s" : ""} awaiting confirmation</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Delivered — confirm receipt</p>
                  </div>
                  <PackageCheck className="h-4 w-4 text-amber-500 shrink-0 ml-2" />
                </div>
              </Link>
            )}
            {pay_pending > 0 && (
              <Link href="/finance/supplier-payments" className="group">
                <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-violet-900 dark:text-violet-200">{pay_pending} payment{pay_pending !== 1 ? "s" : ""} pending</p>
                    <p className="text-xs text-violet-700 dark:text-violet-400 font-mono mt-0.5">{fmtAmt(pay_pending_amt)}</p>
                  </div>
                  <CreditCard className="h-4 w-4 text-violet-500 shrink-0 ml-2" />
                </div>
              </Link>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Recent Activity ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Collections */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-[#071A3A] dark:text-white">
                <Banknote className="h-4 w-4 text-emerald-600" /> Recent Collections
              </CardTitle>
              <Link href="/finance/collections" className="text-xs text-[#E67A32] hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {(recentCollections.data ?? []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No collections yet</p>
                <Link href="/finance/collections/new" className="text-xs text-[#E67A32] hover:underline mt-1 inline-block">Record first collection →</Link>
              </div>
            ) : (recentCollections.data ?? []).map(c => (
              <Link key={c.id} href={`/finance/collections/${c.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{c.collection_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(c.collection_date)} · {MODE_LABEL[c.payment_mode] ?? c.payment_mode}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono tabular-nums">{c.currency} {Number(c.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${COLLECTION_STATUS[c.status]}`}>{c.status}</Badge>
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
                <ArrowRightLeft className="h-4 w-4 text-blue-600" /> Recent Transfers
              </CardTitle>
              <Link href="/finance/transfers" className="text-xs text-[#E67A32] hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {(recentTransfers.data ?? []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No transfers yet</p>
                <Link href="/finance/transfers/new" className="text-xs text-[#E67A32] hover:underline mt-1 inline-block">Initiate first transfer →</Link>
              </div>
            ) : (recentTransfers.data ?? []).map(t => (
              <Link key={t.id} href={`/finance/transfers/${t.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{t.transfer_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.source_region} → {t.destination_region}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(t.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono tabular-nums">{t.currency} {Number(t.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${TRANSFER_STATUS[t.status]}`}>{t.status.replace("_", " ")}</Badge>
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
                <CreditCard className="h-4 w-4 text-violet-600" /> Recent Payments
              </CardTitle>
              <Link href="/finance/supplier-payments" className="text-xs text-[#E67A32] hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {(recentPayments.data ?? []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No payments yet</p>
                <Link href="/finance/supplier-payments/new" className="text-xs text-[#E67A32] hover:underline mt-1 inline-block">Record first payment →</Link>
              </div>
            ) : (recentPayments.data ?? []).map(p => (
              <Link key={p.id} href={`/finance/supplier-payments/${p.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-[#E67A32] truncate">{p.payment_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.supplier_name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(p.payment_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${PAYMENT_STATUS[p.status]}`}>{p.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
