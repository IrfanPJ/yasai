"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FundCollection, FundCollectionStatus } from "@/types";

const STATUS_COLORS: Record<FundCollectionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const STATUS_LABELS: Record<FundCollectionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  verified: "Verified",
};

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { collections: FundCollection[] }

export function FundCollectionTable({ collections }: Props) {
  const [search, setSearch] = useState("");

  const filtered = collections.filter(c =>
    !search ||
    c.collection_number.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by number or customer…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border overflow-hidden">
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
                <TableCell className="capitalize">{c.payment_mode === "bank_transfer" ? "Bank Transfer" : "Cash"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(c.collection_date)}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
