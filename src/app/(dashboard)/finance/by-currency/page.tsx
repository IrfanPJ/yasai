import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Layers } from "lucide-react";
import { CURRENCIES } from "@/lib/currencies";

export const metadata = { title: "By Currency" };

interface Row {
  currency: string;
  amount: number;
}

interface CurrencyStats {
  currency: string;
  collections: { count: number; total: number };
  transfers: { count: number; total: number };
  payments: { count: number; total: number };
}

function summarize(rows: Row[]) {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const cur = map.get(r.currency) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.amount) || 0;
    map.set(r.currency, cur);
  }
  return map;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ByCurrencyPage() {
  const supabase = await createClient();

  const [{ data: collections }, { data: transfers }, { data: payments }] = await Promise.all([
    supabase.from("fund_collections").select("currency, amount").is("deleted_at", null),
    supabase.from("fund_transfers").select("currency, amount"),
    supabase.from("supplier_payments").select("currency, amount"),
  ]);

  const collectionsByCurrency = summarize((collections ?? []) as Row[]);
  const transfersByCurrency = summarize((transfers ?? []) as Row[]);
  const paymentsByCurrency = summarize((payments ?? []) as Row[]);

  // Always list every supported currency, even ones with zero activity so
  // far — plus anything unexpected already in the data (e.g. a legacy
  // value not in the current list), so nothing is silently hidden either.
  const allCurrencies = Array.from(new Set([
    ...CURRENCIES,
    ...collectionsByCurrency.keys(),
    ...transfersByCurrency.keys(),
    ...paymentsByCurrency.keys(),
  ])).sort();

  const stats: CurrencyStats[] = allCurrencies.map((currency) => ({
    currency,
    collections: collectionsByCurrency.get(currency) ?? { count: 0, total: 0 },
    transfers: transfersByCurrency.get(currency) ?? { count: 0, total: 0 },
    payments: paymentsByCurrency.get(currency) ?? { count: 0, total: 0 },
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">By Currency</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every collection, transfer, and supplier payment, grouped by currency — how many of each, and how much.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left font-semibold px-4 py-3">
                    <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Currency</span>
                  </th>
                  <th className="text-right font-semibold px-4 py-3">Collections</th>
                  <th className="text-right font-semibold px-4 py-3">Collected Total</th>
                  <th className="text-right font-semibold px-4 py-3">Transfers</th>
                  <th className="text-right font-semibold px-4 py-3">Transferred Total</th>
                  <th className="text-right font-semibold px-4 py-3">Payments</th>
                  <th className="text-right font-semibold px-4 py-3">Paid Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const hasActivity = s.collections.count + s.transfers.count + s.payments.count > 0;
                  return (
                    <tr
                      key={s.currency}
                      className={`border-b border-gray-50 dark:border-gray-900 last:border-0 ${hasActivity ? "" : "text-muted-foreground"}`}
                    >
                      <td className={`px-4 py-3 font-mono font-bold ${hasActivity ? "text-[#071A3A] dark:text-white" : ""}`}>{s.currency}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.collections.count}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(s.collections.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.transfers.count}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(s.transfers.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.payments.count}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(s.payments.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </CardContent>
      </Card>
    </div>
  );
}
