"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Invoice } from "@/types";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/types";
import { Receipt } from "lucide-react";

interface InvoiceTableProps {
  invoices: Invoice[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No invoices yet. Create your first invoice to start billing customers.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50/50 dark:bg-gray-900/50">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Invoice #</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Job Order</th>
            <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Amount</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Due Date</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/invoices/${inv.id}`} className="font-bold text-[#071A3A] dark:text-white hover:text-[#E67A32] transition-colors">
                  {inv.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium">{inv.customer_name}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {inv.job_order_id ? (
                  <Link href={`/jobs/${inv.job_order_id}`} className="hover:text-[#E67A32]">
                    {(inv.job_order as { job_number?: string })?.job_number || "—"}
                  </Link>
                ) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {inv.currency} {inv.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-sm">
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : <span className="text-xs italic">No due date</span>}
              </td>
              <td className="px-4 py-3">
                <Badge className={`${INVOICE_STATUS_COLORS[inv.status]} text-xs font-semibold`}>
                  {INVOICE_STATUS_LABELS[inv.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(inv.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
