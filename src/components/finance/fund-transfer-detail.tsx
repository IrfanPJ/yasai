"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Pencil, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FundTransferForm } from "./fund-transfer-form";
import type { FundTransfer, FundTransferStatus } from "@/types";

const STATUS_COLORS: Record<FundTransferStatus, string> = {
  initiated: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delivered: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const NEXT_STATUS: Partial<Record<FundTransferStatus, FundTransferStatus>> = {
  initiated: "in_transit",
  in_transit: "delivered",
  delivered: "confirmed",
};

const NEXT_LABEL: Partial<Record<FundTransferStatus, string>> = {
  initiated: "Mark In Transit",
  in_transit: "Mark Delivered",
  delivered: "Confirm Receipt",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { transfer: FundTransfer }

export function FundTransferDetail({ transfer }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(transfer.received_amount?.toString() ?? "");
  const [receiptDate, setReceiptDate] = useState(transfer.receipt_date ?? new Date().toISOString().slice(0, 10));

  const nextStatus = NEXT_STATUS[transfer.status];

  async function handleAdvance() {
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      const body: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === "confirmed") {
        body.received_amount = receivedAmount ? parseFloat(receivedAmount) : undefined;
        body.receipt_date = receiptDate;
      }
      const res = await fetch(`/api/fund-transfers/${transfer.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Status updated to ${nextStatus.replace("_", " ")}`);
      router.refresh();
    } catch { toast.error("Failed to update status"); }
    finally { setAdvancing(false); }
  }

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold">Edit Transfer</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      <FundTransferForm initial={transfer} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {nextStatus && (
          <Button size="sm" onClick={handleAdvance} disabled={advancing} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {NEXT_LABEL[transfer.status]}
          </Button>
        )}
        {transfer.status === "initiated" && (
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Transfer Number</p>
              <p className="text-2xl font-bold font-mono text-[#E67A32]">{transfer.transfer_number}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[transfer.status]}`}>
              {transfer.status.replace("_", " ")}
            </Badge>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-semibold font-mono">{transfer.currency} {Number(transfer.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mode</p>
              <p className="text-sm font-semibold">{transfer.transfer_mode === "bank_transfer" ? "Bank Transfer" : "3rd Party Cash"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="text-sm font-semibold">{transfer.source_region} → {transfer.destination_region}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Initiated</p>
              <p className="text-sm font-semibold">{fmtDate(transfer.created_at)}</p>
            </div>
          </div>
          {(transfer.third_party_name || transfer.destination_bank_account || transfer.bank_reference) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {transfer.third_party_name && (
                  <div><p className="text-xs text-muted-foreground">3rd Party</p><p className="text-sm">{transfer.third_party_name}</p></div>
                )}
                {transfer.third_party_location && (
                  <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm">{transfer.third_party_location}</p></div>
                )}
                {transfer.destination_bank_account && (
                  <div><p className="text-xs text-muted-foreground">Dest. Account</p><p className="text-sm font-mono">{transfer.destination_bank_account}</p></div>
                )}
                {transfer.bank_reference && (
                  <div><p className="text-xs text-muted-foreground">Bank Ref.</p><p className="text-sm font-mono">{transfer.bank_reference}</p></div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm receipt inputs */}
      {transfer.status === "delivered" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Confirm Receipt</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Received Amount</Label>
              <Input type="number" step="0.01" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt Date</Label>
              <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {transfer.received_amount && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Receipt Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Received Amount</p><p className="text-sm font-semibold font-mono">{transfer.currency} {Number(transfer.received_amount).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Receipt Date</p><p className="text-sm">{fmtDate(transfer.receipt_date)}</p></div>
            <div><p className="text-xs text-muted-foreground">Confirmed By</p><p className="text-sm">{fmtDate(transfer.confirmed_at)}</p></div>
          </CardContent>
        </Card>
      )}

      {transfer.notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{transfer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
