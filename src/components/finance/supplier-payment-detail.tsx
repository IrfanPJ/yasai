"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Pencil, CheckCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SupplierPaymentForm } from "./supplier-payment-form";
import type { SupplierPayment, SupplierPaymentStatus } from "@/types";

const STATUS_COLORS: Record<SupplierPaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const MODE_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cdm: "CDM Deposit",
  cash_hand: "Cash to Hand",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { payment: SupplierPayment }

export function SupplierPaymentDetail({ payment }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [notifyOps, setNotifyOps] = useState(true);

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/supplier-payments/${payment.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_operations: notifyOps }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Payment marked as paid");
      router.refresh();
    } catch { toast.error("Failed"); }
    finally { setMarkingPaid(false); }
  }

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold">Edit Payment</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      <SupplierPaymentForm initial={payment} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {payment.status === "pending" && (
          <Button size="sm" onClick={handleMarkPaid} disabled={markingPaid} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Mark as Paid
          </Button>
        )}
        {payment.status === "pending" && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {/* Main card */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payment Number</p>
              <p className="text-2xl font-bold font-mono text-[#E67A32]">{payment.payment_number}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[payment.status]}`}>{payment.status}</Badge>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="text-sm font-semibold">{payment.supplier_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-semibold font-mono">{payment.currency} {Number(payment.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mode</p>
              <p className="text-sm font-semibold">{MODE_LABELS[payment.payment_mode] ?? payment.payment_mode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-semibold">{fmtDate(payment.payment_date)}</p>
            </div>
          </div>
          {(payment.bank_reference || payment.cdm_account || payment.messenger_name) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                {payment.bank_reference && <div><p className="text-xs text-muted-foreground">Bank Reference</p><p className="text-sm font-mono">{payment.bank_reference}</p></div>}
                {payment.cdm_account && <div><p className="text-xs text-muted-foreground">CDM Account</p><p className="text-sm font-mono">{payment.cdm_account}</p></div>}
                {payment.messenger_name && <div><p className="text-xs text-muted-foreground">Messenger</p><p className="text-sm">{payment.messenger_name}</p></div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notify ops toggle */}
      {payment.status === "pending" && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#E67A32]" />
                <Label htmlFor="notify-ops" className="cursor-pointer">Notify Operations Manager when marking paid</Label>
              </div>
              <Switch id="notify-ops" checked={notifyOps} onCheckedChange={setNotifyOps} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ops notification status */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Operations Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Operations Notified</p>
            <p className="text-sm font-medium">{payment.operations_notified ? "Yes" : "No"}</p>
          </div>
          {payment.operations_notified_at && (
            <div>
              <p className="text-xs text-muted-foreground">Notified At</p>
              <p className="text-sm">{fmtDate(payment.operations_notified_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {payment.notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{payment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
