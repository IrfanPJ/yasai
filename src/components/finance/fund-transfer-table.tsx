"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const filtered = transfers.filter(t =>
    !search || t.transfer_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by transfer number…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border overflow-hidden">
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
        </Table>
      </div>
    </div>
  );
}
