"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Download, Send, CheckCircle2, XCircle, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/utils";
import type { Invoice, UserRole } from "@/types";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/types";

interface InvoiceDetailProps {
  invoice: Invoice;
  userRole: UserRole;
}

export function InvoiceDetail({ invoice, userRole }: InvoiceDetailProps) {
  const router = useRouter();
  const canManage = ["admin", "operations", "finance"].includes(userRole);
  const [loading, setLoading] = useState<string | null>(null);
  const base = `/api/invoices/${invoice.id}`;

  async function act(key: string, fn: () => Promise<unknown>) {
    setLoading(key);
    try {
      await fn();
      toast.success("Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  async function post(url: string, body?: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }

  const isDraft = invoice.status === "draft";
  const canSend = isDraft || invoice.status === "overdue";
  const canPay = invoice.status === "sent" || invoice.status === "overdue";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071A3A] dark:text-white">{invoice.invoice_number}</h1>
          <p className="text-muted-foreground text-sm mt-1">{invoice.customer_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${INVOICE_STATUS_COLORS[invoice.status]} font-semibold`}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Badge>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => window.open(`${base}/pdf`, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />Download PDF
          </Button>
          {canManage && canSend && (
            <Button
              size="sm" className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]"
              disabled={loading === "send"}
              onClick={() => act("send", () => post(`${base}/send`))}
            >
              {loading === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Invoice
            </Button>
          )}
          {canManage && canPay && (
            <Button
              size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
              disabled={loading === "pay"}
              onClick={() => act("pay", () => post(`${base}/mark-paid`))}
            >
              {loading === "pay" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Meta */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block uppercase tracking-wide">Issued</span>
              <span className="font-medium">{invoice.issued_at ? formatDateTime(invoice.issued_at) : "Not yet sent"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block uppercase tracking-wide">Due Date</span>
              <span className="font-medium">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-GB") : "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block uppercase tracking-wide">Currency</span>
              <span className="font-medium">{invoice.currency}</span>
            </div>
            {invoice.job_order_id && (
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wide">Job Order</span>
                <Link href={`/jobs/${invoice.job_order_id}`} className="font-medium text-[#E67A32] hover:underline flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  {(invoice.job_order as { job_number?: string })?.job_number || "View"}
                </Link>
              </div>
            )}
          </div>
          {invoice.paid_at && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Paid on {formatDateTime(invoice.paid_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill to */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Bill To</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p className="font-semibold">{invoice.customer_name}</p>
          {invoice.customer_email && <p className="text-muted-foreground">{invoice.customer_email}</p>}
          {invoice.customer_address && <p className="text-muted-foreground whitespace-pre-line">{invoice.customer_address}</p>}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left pb-2">Description</th>
                <th className="text-right pb-2 w-16">Qty</th>
                <th className="text-right pb-2 w-24">Unit Price</th>
                <th className="text-right pb-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.line_items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right text-muted-foreground">{item.qty}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {invoice.currency} {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {invoice.currency} {Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-3" />

          <div className="space-y-1.5 text-sm ml-auto max-w-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({invoice.tax_rate}%)</span>
                <span>{invoice.currency} {Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1.5">
              <span>Total</span>
              <span>{invoice.currency} {Number(invoice.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.payment_notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payment Notes</p>
            <p className="text-sm">{invoice.payment_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status history */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Created: {formatDateTime(invoice.created_at)}</p>
        <p>Updated: {formatDateTime(invoice.updated_at)}</p>
      </div>
    </div>
  );
}
