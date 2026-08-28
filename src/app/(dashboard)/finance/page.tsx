import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, ArrowRightLeft, CreditCard, FileText } from "lucide-react";

export default async function FinancePage() {
  const supabase = await createClient();

  const [collections, transfers, payments, docs] = await Promise.all([
    supabase.from("fund_collections").select("id, status", { count: "exact" }),
    supabase.from("fund_transfers").select("id, status", { count: "exact" }),
    supabase.from("supplier_payments").select("id, status", { count: "exact" }),
    supabase.from("backup_documents").select("id", { count: "exact" }),
  ]);

  const cards = [
    {
      label: "Fund Collections",
      href: "/finance/collections",
      icon: Banknote,
      count: collections.count ?? 0,
      pending: (collections.data ?? []).filter(r => r.status === "pending").length,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Fund Transfers",
      href: "/finance/transfers",
      icon: ArrowRightLeft,
      count: transfers.count ?? 0,
      pending: (transfers.data ?? []).filter(r => r.status === "initiated" || r.status === "in_transit").length,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Supplier Payments",
      href: "/finance/supplier-payments",
      icon: CreditCard,
      count: payments.count ?? 0,
      pending: (payments.data ?? []).filter(r => r.status === "pending").length,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
    {
      label: "Backup Documents",
      href: "/finance/backup-docs",
      icon: FileText,
      count: docs.count ?? 0,
      pending: 0,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">Fund collections, transfers, supplier payments &amp; backup documents</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Link key={card.href} href={card.href}>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-4`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold font-variant-numeric tabular-nums">{card.count}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
                {card.pending > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">{card.pending} pending</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
