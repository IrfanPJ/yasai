"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Pencil, ArrowRight, Upload, X, Link2, FileText, Banknote, CreditCard } from "lucide-react";
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

interface LinkedCollection {
  id: string;
  collection_number: string;
  status: string;
  amount: number;
  currency: string;
  customer_name: string;
}

interface LinkedPayment {
  id: string;
  payment_number: string;
  status: string;
  amount: number;
  currency: string;
  supplier_name: string;
}

interface Props {
  transfer: FundTransfer;
  linkedCollection?: LinkedCollection;
  linkedPayments?: LinkedPayment[];
}

export function FundTransferDetail({ transfer, linkedCollection, linkedPayments = [] }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState(transfer.received_amount?.toString() ?? "");
  const [receiptDate, setReceiptDate] = useState(transfer.receipt_date ?? new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(transfer.receipt_url);
  const [backupUrl, setBackupUrl] = useState<string | undefined>(transfer.backup_document_url);
  const [thirdPartyUrl, setThirdPartyUrl] = useState<string | undefined>(transfer.third_party_receipt_url);
  const receiptRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const thirdPartyRef = useRef<HTMLInputElement>(null);

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

  async function handleUpload(type: "receipt" | "backup_document" | "third_party_receipt", file: File) {
    setUploading(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`/api/fund-transfers/${transfer.id}/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const { url } = await res.json();
      if (type === "receipt") setReceiptUrl(url);
      else if (type === "backup_document") setBackupUrl(url);
      else setThirdPartyUrl(url);
      toast.success("Document uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(null); }
  }

  async function handleRemove(type: "receipt" | "backup_document" | "third_party_receipt") {
    setUploading(type);
    try {
      const res = await fetch(`/api/fund-transfers/${transfer.id}/upload?type=${type}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      if (type === "receipt") setReceiptUrl(undefined);
      else if (type === "backup_document") setBackupUrl(undefined);
      else setThirdPartyUrl(undefined);
      toast.success("Removed");
    } catch { toast.error("Remove failed"); }
    finally { setUploading(null); }
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
            <div><p className="text-xs text-muted-foreground">Confirmed At</p><p className="text-sm">{fmtDate(transfer.confirmed_at)}</p></div>
          </CardContent>
        </Card>
      )}

      {/* Documents / uploads */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Receipt */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Receipt / Confirmation</p>
            {receiptUrl
              ? <DocRow url={receiptUrl} label="View receipt" onRemove={() => handleRemove("receipt")} loading={uploading === "receipt"} />
              : <p className="text-xs text-muted-foreground mb-1.5">No receipt uploaded.</p>}
            <input ref={receiptRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload("receipt", f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled={!!uploading} onClick={() => receiptRef.current?.click()}>
              {uploading === "receipt" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {receiptUrl ? "Replace" : "Upload"} receipt
            </Button>
          </div>
          <Separator />
          {/* Backup doc */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Backup Document (PI/PO)</p>
            {backupUrl
              ? <DocRow url={backupUrl} label="View backup doc" onRemove={() => handleRemove("backup_document")} loading={uploading === "backup_document"} />
              : <p className="text-xs text-muted-foreground mb-1.5">No backup document uploaded.</p>}
            <input ref={backupRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload("backup_document", f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled={!!uploading} onClick={() => backupRef.current?.click()}>
              {uploading === "backup_document" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {backupUrl ? "Replace" : "Upload"} backup doc
            </Button>
          </div>
          {transfer.transfer_mode === "cash_third_party" && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">3rd Party Receipt</p>
                {thirdPartyUrl
                  ? <DocRow url={thirdPartyUrl} label="View 3rd party receipt" onRemove={() => handleRemove("third_party_receipt")} loading={uploading === "third_party_receipt"} />
                  : <p className="text-xs text-muted-foreground mb-1.5">No 3rd party receipt uploaded.</p>}
                <input ref={thirdPartyRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload("third_party_receipt", f); e.target.value = ""; }} />
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled={!!uploading} onClick={() => thirdPartyRef.current?.click()}>
                  {uploading === "third_party_receipt" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {thirdPartyUrl ? "Replace" : "Upload"} 3rd party receipt
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Linked chain */}
      {(linkedCollection || linkedPayments.length > 0) && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Fund Flow Chain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedCollection && (
              <a href={`/finance/collections/${linkedCollection.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Source Collection</p>
                    <p className="text-sm font-mono font-semibold text-[#E67A32]">{linkedCollection.collection_number}</p>
                    <p className="text-xs text-muted-foreground">{linkedCollection.customer_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{linkedCollection.currency} {Number(linkedCollection.amount).toLocaleString()}</p>
                  <Badge className="text-[10px] px-1.5 py-0 capitalize bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{linkedCollection.status}</Badge>
                </div>
              </a>
            )}
            {linkedPayments.map(p => (
              <a key={p.id} href={`/finance/supplier-payments/${p.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-violet-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier Payment</p>
                    <p className="text-sm font-mono font-semibold text-[#E67A32]">{p.payment_number}</p>
                    <p className="text-xs text-muted-foreground">{p.supplier_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{p.currency} {Number(p.amount).toLocaleString()}</p>
                  <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">{p.status}</Badge>
                </div>
              </a>
            ))}
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

function DocRow({ url, label, onRemove, loading }: { url: string; label: string; onRemove: () => void; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-1.5">
      <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 dark:text-blue-400 underline truncate flex-1">{label}</a>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={onRemove} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </Button>
    </div>
  );
}
