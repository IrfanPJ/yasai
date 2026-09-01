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
import type { SupplierPayment, SupplierPaymentStatus } from "@/types";

const STATUS_COLORS: Record<SupplierPaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const MODE_LABELS: Record<string, string> = {
  bank_transfer: "Bank",
  cdm: "CDM",
  cash_hand: "Cash to Hand",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { payments: SupplierPayment[] }

export function SupplierPaymentTable({ payments }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => payments.filter(p => {
    if (search && !p.payment_number.toLowerCase().includes(search.toLowerCase()) && !p.supplier_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== "all" && p.status !== status) return false;
    if (dateFrom && p.payment_date < dateFrom) return false;
    if (dateTo && p.payment_date > dateTo) return false;
    return true;
  }), [payments, search, status, dateFrom, dateTo]);

  const totalAed = useMemo(() => filtered.filter(p => p.currency === "AED").reduce((s, p) => s + Number(p.amount), 0), [filtered]);
  const hasFilters = search || status !== "all" || dateFrom || dateTo;

  function clearFilters() { setSearch(""); setStatus("all"); setDateFrom(""); setDateTo(""); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by number or supplier…" className="pl-9 w-56" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
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
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {payments.length}</span>
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead>Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Ops</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No supplier payments found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                <TableCell>
                  <Link href={`/finance/supplier-payments/${p.id}`} className="font-mono font-semibold text-[#E67A32] hover:underline">
                    {p.payment_number}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{p.supplier_name}</TableCell>
                <TableCell className="font-mono tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{MODE_LABELS[p.payment_mode] ?? p.payment_mode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(p.payment_date)}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${p.operations_notified ? "text-green-600" : "text-muted-foreground"}`}>
                    {p.operations_notified ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <tfoot>
              <TableRow className="bg-gray-50/80 dark:bg-gray-900/80 font-semibold">
                <TableCell colSpan={2} className="text-xs text-muted-foreground py-2 pl-4">Total ({filtered.length} records)</TableCell>
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
