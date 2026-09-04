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
import type { FundCollection, FundCollectionStatus } from "@/types";

const STATUS_COLORS: Record<FundCollectionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { collections: FundCollection[] }

export function FundCollectionTable({ collections }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => collections.filter(c => {
    if (search && !c.collection_number.toLowerCase().includes(search.toLowerCase()) && !c.customer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== "all" && c.status !== status) return false;
    if (dateFrom && c.collection_date < dateFrom) return false;
    if (dateTo && c.collection_date > dateTo) return false;
    return true;
  }), [collections, search, status, dateFrom, dateTo]);

  const totalAed = useMemo(() => filtered.filter(c => c.currency === "AED").reduce((s, c) => s + Number(c.amount), 0), [filtered]);
  const hasFilters = search || status !== "all" || dateFrom || dateTo;

  function clearFilters() { setSearch(""); setStatus("all"); setDateFrom(""); setDateTo(""); }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
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
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {collections.length}</span>
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No fund collections found</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                <TableCell>
                  <Link href={`/finance/collections/${c.id}`} className="font-mono font-semibold text-[#E67A32] hover:underline">
                    {c.collection_number}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{c.customer_name}</TableCell>
                <TableCell className="font-mono tabular-nums">{c.currency} {Number(c.amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{{ cash: "Cash", bank_transfer: "Bank Transfer", cheque: "Cheque" }[c.payment_mode] ?? c.payment_mode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(c.collection_date)}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <tfoot>
              <TableRow className="bg-gray-50/80 dark:bg-gray-900/80 font-semibold">
                <TableCell colSpan={2} className="text-xs text-muted-foreground py-2 pl-4">Total ({filtered.length} records)</TableCell>
                <TableCell className="font-mono tabular-nums text-sm py-2">AED {totalAed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
