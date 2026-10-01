"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Download, Send, CheckCircle2, Truck, FileText, ExternalLink, Pencil, Check, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Invoice, UserRole, UserProfile } from "@/types";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/types";

interface InvoiceDetailProps {
  invoice: Invoice;
  userRole: UserRole;
  allUsers: Pick<UserProfile, "id" | "full_name" | "email">[];
}

// Local <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the
// viewer's own timezone, not the UTC ISO string the API stores.
function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InvoiceDetail({ invoice: initialInvoice, userRole, allUsers }: InvoiceDetailProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const canManage = ["admin", "operations", "finance"].includes(userRole);
  const isAdmin = userRole === "admin";
  const [loading, setLoading] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [draftCreatedAt, setDraftCreatedAt] = useState(() => toDatetimeLocal(invoice.created_at));
  const [draftCreatedBy, setDraftCreatedBy] = useState(invoice.created_by || "");
  const base = `/api/invoices/${invoice.id}`;

  function startEditMeta() {
    setDraftCreatedAt(toDatetimeLocal(invoice.created_at));
    setDraftCreatedBy(invoice.created_by || "");
    setEditingMeta(true);
  }

  async function saveMeta() {
    setSavingMeta(true);
    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_at: draftCreatedAt, created_by: draftCreatedBy }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      const updated = await res.json();
      setInvoice(updated);
      setEditingMeta(false);
      toast.success("Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingMeta(false);
    }
  }

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
          {canManage && isDraft && invoice.invoice_type !== "uploaded" && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Link>
            </Button>
          )}
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
            {invoice.reference_number && (
              <div>
                <span className="text-xs text-muted-foreground block uppercase tracking-wide">Reference No</span>
                <span className="font-medium">{invoice.reference_number}</span>
              </div>
            )}
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
                {invoice.invoice_type === "freight" && <th className="text-left pb-2 w-28">Country</th>}
                <th className="text-right pb-2 w-16">Qty</th>
                <th className="text-right pb-2 w-24">Rate</th>
                {invoice.invoice_type === "freight" && <th className="text-right pb-2 w-20">VAT</th>}
                <th className="text-right pb-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.line_items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2">
                    <p>{item.description}</p>
                    {item.model_description && <p className="text-xs text-muted-foreground">{item.model_description}</p>}
                  </td>
                  {invoice.invoice_type === "freight" && (
                    <td className="py-2 text-muted-foreground text-xs">{item.country_of_origin || "—"}</td>
                  )}
                  <td className="py-2 text-right text-muted-foreground">{item.qty}</td>
                  <td className="py-2 text-right text-muted-foreground font-mono">
                    {formatMoney(item.unit_price)}
                  </td>
                  {invoice.invoice_type === "freight" && (
                    <td className="py-2 text-right text-muted-foreground font-mono">{formatMoney(item.vat_amount)}</td>
                  )}
                  <td className="py-2 text-right font-medium font-mono">
                    {formatMoney(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-3" />

          <div className="space-y-1.5 text-sm ml-auto max-w-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{invoice.currency} {formatMoney(invoice.subtotal)}</span>
            </div>
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>VAT{Number(invoice.tax_rate) > 0 ? ` (${invoice.tax_rate}%)` : ""}</span>
                <span>{invoice.currency} {formatMoney(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1.5">
              <span>Total</span>
              <span>{invoice.currency} {formatMoney(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded invoice file */}
      {invoice.invoice_type === "uploaded" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Uploaded Invoice File</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.uploaded_file_url ? (
              <a
                href={invoice.uploaded_file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 underline"
              >
                <FileText className="h-4 w-4" />
                View uploaded invoice
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No file uploaded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Freight shipping details */}
      {invoice.invoice_type === "freight" && (invoice.port_of_loading || invoice.packages_count || invoice.final_destination) && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Shipping Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            {invoice.port_of_loading && (
              <div><p className="text-xs text-muted-foreground">Port of Loading</p><p className="font-medium">{invoice.port_of_loading}</p></div>
            )}
            {invoice.packages_count && (
              <div><p className="text-xs text-muted-foreground">Packages</p><p className="font-medium">{invoice.packages_count}</p></div>
            )}
            {invoice.final_destination && (
              <div><p className="text-xs text-muted-foreground">Final Destination</p><p className="font-medium">{invoice.final_destination}</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {invoice.payment_notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payment Notes</p>
            <p className="text-sm">{invoice.payment_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status history */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-4">
          {editingMeta ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block uppercase tracking-wide mb-1">
                    Created Date
                  </label>
                  <input
                    type="datetime-local"
                    value={draftCreatedAt}
                    onChange={(e) => setDraftCreatedAt(e.target.value)}
                    className="w-full h-9 rounded-md border px-2.5 text-sm bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block uppercase tracking-wide mb-1">
                    Creator
                  </label>
                  <Select value={draftCreatedBy} onValueChange={setDraftCreatedBy}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="gap-1.5" disabled={savingMeta} onClick={saveMeta}>
                  {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={savingMeta} onClick={() => setEditingMeta(false)}>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Created: {formatDateTime(invoice.created_at)}
                  {invoice.creator && <> by {invoice.creator.full_name || invoice.creator.email}</>}
                </p>
                <p>Updated: {formatDateTime(invoice.updated_at)}</p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs text-muted-foreground" onClick={startEditMeta}>
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
