import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { CURRENCIES } from "@/lib/currencies";

export const metadata = { title: "By Currency" };

interface Row {
  currency: string;
  amount: number;
}

interface TransferRow extends Row {
  fund_collection_id: string | null;
}

interface Metric {
  count: number;
  total: number;
}

interface CurrencyStats {
  currency: string;
  collections: Metric;
  transfers: Metric;
  // Of the Transferred total, how much traces back to an actual same-currency
  // collection vs. was recorded with no such link — the direct answer to
  // "where did this transferred money actually come from."
  transfersLinked: number;
  transfersUnlinked: number;
  payments: Metric;
}

// Validated 3-slot categorical palette (dataviz skill default, slots 1-3):
// clears CVD + contrast gates in both themes. Identity, not status — none
// of these three flows is "good" or "bad", just a different direction.
const SERIES = {
  collections: { label: "Collected", bar: "bg-[#2a78d6] dark:bg-[#3987e5]", dot: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  transfers:   { label: "Transferred", bar: "bg-[#eb6834] dark:bg-[#d95926]", dot: "bg-[#eb6834] dark:bg-[#d95926]" },
  payments:    { label: "Paid", bar: "bg-[#1baf7a] dark:bg-[#199e70]", dot: "bg-[#1baf7a] dark:bg-[#199e70]" },
} as const;

function summarize(rows: Row[]) {
  const map = new Map<string, Metric>();
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

function Bar({ metricKey, value, count, max }: { metricKey: keyof typeof SERIES; value: number; count: number; max: number }) {
  const series = SERIES[metricKey];
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className={`h-2 w-2 rounded-full shrink-0 ${series.dot}`} />
          {series.label}
          <span className="text-[10px] text-muted-foreground/70">({count})</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-foreground">{fmt(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${series.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CurrencyCard({ s }: { s: CurrencyStats }) {
  const max = Math.max(s.collections.total, s.transfers.total, s.payments.total, 1);
  const net = s.collections.total - s.payments.total;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-bold text-[#071A3A] dark:text-white">{s.currency}</span>
          <span
            className={`text-xs font-mono font-semibold tabular-nums ${
              net > 0 ? "text-[#006300] dark:text-[#0ca30c]" : "text-muted-foreground"
            }`}
            title="Collected minus Paid — a rough read on whether this currency is net accumulating or depleting"
          >
            Net {net >= 0 ? "+" : ""}{fmt(net)}
          </span>
        </div>
        <Bar metricKey="collections" value={s.collections.total} count={s.collections.count} max={max} />
        <div className="space-y-1">
          <Bar metricKey="transfers" value={s.transfers.total} count={s.transfers.count} max={max} />
          {s.transfers.total > 0 && (
            <p className="text-[11px] text-muted-foreground pl-3.5">
              {s.transfersLinked > 0 && <>traced to a collection: {fmt(s.transfersLinked)}</>}
              {s.transfersLinked > 0 && s.transfersUnlinked > 0 && " · "}
              {s.transfersUnlinked > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  not linked to any collection: {fmt(s.transfersUnlinked)}
                </span>
              )}
            </p>
          )}
        </div>
        <Bar metricKey="payments" value={s.payments.total} count={s.payments.count} max={max} />
      </CardContent>
    </Card>
  );
}

export default async function ByCurrencyPage() {
  const supabase = await createClient();

  // Note: fund_collections has no deleted_at column (unlike the logistics
  // GCN table) — don't filter on one, or the whole query errors silently.
  const [{ data: collections }, { data: transfers }, { data: payments }] = await Promise.all([
    supabase.from("fund_collections").select("id, currency, amount"),
    supabase.from("fund_transfers").select("currency, amount, fund_collection_id"),
    supabase.from("supplier_payments").select("currency, amount"),
  ]);

  const collectionRows = (collections ?? []) as (Row & { id: string })[];
  const collectionCurrencyById = new Map(collectionRows.map((c) => [c.id, c.currency]));

  const collectionsByCurrency = summarize(collectionRows);
  const transfersByCurrency = summarize((transfers ?? []) as Row[]);
  const paymentsByCurrency = summarize((payments ?? []) as Row[]);

  // A transfer only counts as "linked" when it points at a collection AND
  // that collection is in the same currency — otherwise there's no real
  // amount to trace it back to.
  const transferRows = (transfers ?? []) as TransferRow[];
  const linkedByCurrency = new Map<string, number>();
  const unlinkedByCurrency = new Map<string, number>();
  for (const t of transferRows) {
    const collectionCurrency = t.fund_collection_id ? collectionCurrencyById.get(t.fund_collection_id) : undefined;
    const bucket = collectionCurrency === t.currency ? linkedByCurrency : unlinkedByCurrency;
    bucket.set(t.currency, (bucket.get(t.currency) ?? 0) + (Number(t.amount) || 0));
  }

  // Always cover every supported currency, plus anything unexpected already
  // in the data (a legacy value not in the current list) — nothing silently
  // hidden in either direction.
  const allCurrencies = Array.from(new Set([
    ...CURRENCIES,
    ...collectionsByCurrency.keys(),
    ...transfersByCurrency.keys(),
    ...paymentsByCurrency.keys(),
  ]));

  const stats: CurrencyStats[] = allCurrencies.map((currency) => ({
    currency,
    collections: collectionsByCurrency.get(currency) ?? { count: 0, total: 0 },
    transfers: transfersByCurrency.get(currency) ?? { count: 0, total: 0 },
    transfersLinked: linkedByCurrency.get(currency) ?? 0,
    transfersUnlinked: unlinkedByCurrency.get(currency) ?? 0,
    payments: paymentsByCurrency.get(currency) ?? { count: 0, total: 0 },
  }));

  const active = stats
    .filter((s) => s.collections.count + s.transfers.count + s.payments.count > 0)
    .sort((a, b) => (b.collections.total + b.transfers.total + b.payments.total) - (a.collections.total + a.transfers.total + a.payments.total));
  const inactive = stats.filter((s) => s.collections.count + s.transfers.count + s.payments.count === 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">By Currency</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            How much has been collected, transferred, and paid — per currency, so you can see where money came from and where it went.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${SERIES[k].dot}`} />
              {SERIES[k].label}
            </span>
          ))}
        </div>
      </div>

      {active.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No transactions recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((s) => (
            <CurrencyCard key={s.currency} s={s} />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">No activity yet:</span>
          {inactive.map((s) => (
            <span
              key={s.currency}
              className="font-mono text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-800 text-muted-foreground"
            >
              {s.currency}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
