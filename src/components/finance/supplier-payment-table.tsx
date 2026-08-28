"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const filtered = payments.filter(p =>
    !search ||
    p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by number or supplier…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead>Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Ops Notified</TableHead>
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
        </Table>
      </div>
    </div>
  );
}
