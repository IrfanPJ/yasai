"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FundTransfer, FundTransferStatus } from "@/types";

const STATUS_COLORS: Record<FundTransferStatus, string> = {
  initiated: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delivered: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const STATUS_LABELS: Record<FundTransferStatus, string> = {
  initiated: "Initiated",
  in_transit: "In Transit",
  delivered: "Delivered",
  confirmed: "Confirmed",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { transfers: FundTransfer[] }

export function FundTransferTable({ transfers }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => transfers.filter(t => {
    if (search && !t.transfer_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== "all" && t.status !== status) return false;
    const tDate = t.created_at?.slice(0, 10) ?? "";
    if (dateFrom && tDate < dateFrom) return false;
    if (dateTo && tDate > dateTo) return false;
    return true;
  }), [transfers, search, status, dateFrom, dateTo]);

  const totalAed = useMemo(() => filtered.filter(t => t.currency === "AED").reduce((s, t) => s + Number(t.amount), 0), [filtered]);
  const hasFilters = search || status !== "all" || dateFrom || dateTo;

  function clearFilters() { setSearch(""); setStatus("all"); setDateFrom(""); setDateTo(""); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by number…" className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="initiated">Initiated</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>From</span>
          <Input type="date" className="h-9 w-36 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span>To</span>
          <Input type="date" className="h-9 w-36 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground h-9" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {transfers.length}</span>
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead>Number</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transfers found</TableCell></TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                <TableCell>
                  <Link href={`/finance/transfers/${t.id}`} className="font-mono font-semibold text-[#E67A32] hover:underline">
                    {t.transfer_number}
                  </Link>
                </TableCell>
                <TableCell className="font-mono tabular-nums">{t.currency} {Number(t.amount).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{t.transfer_mode === "bank_transfer" ? "Bank" : "3rd Party Cash"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.source_region} → {t.destination_region}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <tfoot>
              <TableRow className="bg-gray-50/80 dark:bg-gray-900/80 font-semibold">
                <TableCell className="text-xs text-muted-foreground py-2 pl-4">Total ({filtered.length} records)</TableCell>
                <TableCell className="font-mono tabular-nums text-sm py-2">AED {totalAed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
